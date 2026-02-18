
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AdCampaign, AdGenerationResponse } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Creates a fresh AI client instance. 
 */
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Wraps an API call with retry logic for 429 and 500 errors.
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || JSON.stringify(err);
      const isRetryable = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('500');
      
      if (isRetryable && i < maxRetries - 1) {
        const delay = (i + 1) * 3000 + Math.random() * 1000;
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

export const generateAdCampaigns = async (
  characterImageB64: string,
  styleImageB64: string | null,
  styleName: string,
  onProgress: (index: number) => void
): Promise<AdGenerationResponse> => {
  const ai = getAIClient();
  const charBase64 = characterImageB64.split(',')[1] || characterImageB64;
  const styleBase64 = styleImageB64 ? (styleImageB64.split(',')[1] || styleImageB64) : null;
  
  let referenceInstruction = `The user has selected the style: "${styleName}".`;
  if (styleBase64) {
    referenceInstruction += `
      CRITICAL: A "Style Reference Image" has been provided. 
      Analyze the second image for its SPECIFIC lighting, environment (place), color grading, and clothing/attire.
      The generated ads MUST copy the style, place, and outfit aesthetic from the second image while keeping the exact facial character from the first image.
    `;
  }

  const styleTriggers = `
    - If style is 'Old Money': Equestrian, luxury library, preppy tailoring.
    - If style is 'Cyberpunk': Neon teal/magenta, futuristic rain, high-tech urban.
    - If style is 'Vogue Studio': High-contrast B&W, Chiaroscuro shadows.
    - If style is 'Disposable Cam': 35mm film, direct flash, vintage grain.
    - If style is 'Street Snap': Candid motion, urban blur, shot on iPhone.
  `;

  const strategyPrompt = `
    Act as a world-class High-Fashion Creative Director. 
    1. Analyze the character in the FIRST image for brand DNA and facial identity.
    2. ${styleBase64 ? "Analyze the SECOND image for visual style, location/setting, and fashion/attire." : "Follow the selected style aesthetic."}
    3. Create 5 professional ad concepts.
    
    Instruction: ${referenceInstruction}
    ${styleTriggers}

    Each concept must have:
    - 'title', 'platform', 'audience', 'hook', 'caption', 'visualConcept', 'tone'
    - 'imagePrompt': Detailed technical prompt. If a style reference image was provided, ensure the prompt describes that exact environment and outfit style.
    
    Technical requirements for imagePrompt: "8k, professional photography, cinematic lighting, realistic skin textures, 9:16 aspect ratio".
    CRITICAL: Preserve the character's face from the first image. Use the second image (if provided) for everything else (clothing, background, style).
  `;

  // Fix: Explicitly type parts as any[] to allow mixing text and inlineData objects
  const parts: any[] = [
    { inlineData: { mimeType: 'image/jpeg', data: charBase64 } },
  ];

  if (styleBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
  }

  // Fix: Now correctly pushes text part without TS inference error
  parts.push({ text: strategyPrompt });

  const strategyResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts },
    config: {
      thinkingConfig: { thinkingBudget: 16384 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          influencerAnalysis: { type: Type.STRING },
          campaigns: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                title: { type: Type.STRING },
                platform: { type: Type.STRING },
                audience: { type: Type.STRING },
                hook: { type: Type.STRING },
                caption: { type: Type.STRING },
                visualConcept: { type: Type.STRING },
                tone: { type: Type.STRING },
                imagePrompt: { type: Type.STRING }
              },
              required: ["id", "title", "platform", "audience", "hook", "caption", "visualConcept", "tone", "imagePrompt"]
            }
          }
        },
        required: ["influencerAnalysis", "campaigns"]
      }
    }
  }));

  const strategyText = strategyResponse.text;
  if (!strategyText) throw new Error("No response from Creative Strategy model.");
  const result = JSON.parse(strategyText) as AdGenerationResponse;

  const campaignsWithImages: AdCampaign[] = [];
  
  for (let i = 0; i < result.campaigns.length; i++) {
    onProgress(i);
    const campaign = result.campaigns[i];
    if (i > 0) await sleep(500);

    try {
      // Fix: Explicitly type imgParts as any[] to allow mixing text and inlineData objects
      const imgParts: any[] = [
        { inlineData: { mimeType: 'image/jpeg', data: charBase64 } }
      ];
      if (styleBase64) {
        imgParts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
      }
      // Fix: Now correctly pushes text part without TS inference error
      imgParts.push({ text: `GENERATE AD IMAGE: ${campaign.imagePrompt}. 
        MANDATORY: Preserve the character identity from the first reference image. 
        ${styleBase64 ? "COPY THE CLOTHING, SETTING, AND VISUAL STYLE EXACTLY FROM THE SECOND REFERENCE IMAGE." : ""}
        Professional fashion advertising quality.` 
      });

      const imageResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: imgParts },
        config: { imageConfig: { aspectRatio: "9:16" } }
      }));

      const imagePart = imageResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        campaignsWithImages.push({
          ...campaign,
          imageUrl: `data:image/png;base64,${imagePart.inlineData.data}`
        });
      } else {
        campaignsWithImages.push(campaign);
      }
    } catch (err) {
      console.error(`Failed to generate image for campaign ${i}`, err);
      campaignsWithImages.push(campaign);
    }
  }

  return { ...result, campaigns: campaignsWithImages };
};

export const generateSingleAdCampaign = async (
  characterImageB64: string,
  styleImageB64: string | null,
  styleName: string,
  newId: number
): Promise<AdCampaign> => {
  const ai = getAIClient();
  const charBase64 = characterImageB64.split(',')[1] || characterImageB64;
  const styleBase64 = styleImageB64 ? (styleImageB64.split(',')[1] || styleImageB64) : null;

  const strategyPrompt = `
    Create ONE premium ad concept. Theme: "${styleName}". 
    ${styleBase64 ? "Copy style, setting, and outfit from the SECOND reference image." : ""}
    Preserve character identity from the FIRST reference.
    Output JSON for one campaign object.
  `;

  // Fix: Explicitly type parts as any[] to allow mixing text and inlineData objects
  const parts: any[] = [
    { inlineData: { mimeType: 'image/jpeg', data: charBase64 } }
  ];
  if (styleBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
  }
  // Fix: Now correctly pushes text part without TS inference error
  parts.push({ text: strategyPrompt });

  const strategyResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts },
    config: {
      thinkingConfig: { thinkingBudget: 8192 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          platform: { type: Type.STRING },
          audience: { type: Type.STRING },
          hook: { type: Type.STRING },
          caption: { type: Type.STRING },
          visualConcept: { type: Type.STRING },
          tone: { type: Type.STRING },
          imagePrompt: { type: Type.STRING }
        },
        required: ["title", "platform", "audience", "hook", "caption", "visualConcept", "tone", "imagePrompt"]
      }
    }
  }));

  const text = strategyResponse.text;
  if (!text) throw new Error("No response from Strategy model.");
  const campaign = JSON.parse(text) as AdCampaign;
  campaign.id = newId;

  // Fix: Explicitly type imgParts as any[] to allow mixing text and inlineData objects
  const imgParts: any[] = [
    { inlineData: { mimeType: 'image/jpeg', data: charBase64 } }
  ];
  if (styleBase64) {
    imgParts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
  }
  // Fix: Now correctly pushes text part without TS inference error
  imgParts.push({ text: `PROFESSIONAL AD: ${campaign.imagePrompt}. Reference character must be preserved.` });

  const imageResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: imgParts },
    config: { imageConfig: { aspectRatio: "9:16" } }
  }));

  const imagePart = imageResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (imagePart?.inlineData) {
    campaign.imageUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
  }

  return campaign;
};
