
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AdCampaign, AdGenerationResponse } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Creates a fresh AI client instance. 
 * Invoked per-call to ensure the latest API key from the selection dialog is used.
 */
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Wraps an API call with retry logic for 429 (Rate Limit) and 500 (Server) errors.
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || JSON.stringify(err);
      // Retry on rate limits or transient server errors
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
  
  const strategyPrompt = `
    Act as a world-class High-Fashion Creative Director and Marketing Strategist. 
    1. Deeply analyze the character in the FIRST image for unique brand DNA, facial features, and style.
    2. Develop a premium influencer marketing strategy for this creator.
    3. Generate 5 professional ad concepts optimized for high-conversion social feeds (Reels/TikTok).
    4. The current collection theme is: "${styleName}". 
    ${styleBase64 ? "MANDATORY: Mimic the EXACT lighting, background, and fashion vibe from the SECOND reference image in all ad visuals." : ""}

    Each concept must have:
    - 'title', 'platform', 'audience', 'hook', 'caption', 'visualConcept', 'tone'
    - 'imagePrompt': A technical, descriptive prompt for an AI image generator. 
    - Formatting requirements for imagePrompt: "9:16 vertical aspect ratio, high-end commercial fashion photography, cinematic lighting, shot on 8k digital camera, ultra-detailed skin textures, depth of field". 
    - CHARACTER IDENTITY RULE: Explicitly state that the subject must look exactly like the person in the reference photo.
  `;

  const parts: any[] = [
    { inlineData: { mimeType: 'image/jpeg', data: charBase64 } },
  ];
  if (styleBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
  }
  parts.push({ text: strategyPrompt });

  // STEP 1: Strategic Reasoning using Gemini 3 Pro
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
  if (!strategyText) throw new Error("Agency strategy engine timed out.");
  const result = JSON.parse(strategyText) as AdGenerationResponse;

  // STEP 2: Sequential High-Speed Asset Generation
  const campaignsWithImages: AdCampaign[] = [];
  for (let i = 0; i < result.campaigns.length; i++) {
    onProgress(i);
    const campaign = result.campaigns[i];
    
    // Slight pause to prevent local rate limit spikes
    if (i > 0) await sleep(500);

    try {
      const imgParts: any[] = [
        { inlineData: { mimeType: 'image/jpeg', data: charBase64 } }
      ];
      if (styleBase64) {
        imgParts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
      }
      imgParts.push({ text: `TRANSFORM CHARACTER: ${campaign.imagePrompt}. 
        Subject MUST be the same individual from reference photo 1. ${styleBase64 ? "Environment MUST match reference photo 2." : ""}` 
      });

      // Gemini 2.5 Flash Image is the most stable and performant choice for Vercel
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
      console.error(`Creative asset #${i} failed`, err);
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
    Create ONE boutique ad variation. Collection: "${styleName}". 
    Return JSON for one campaign object matching the standard schema.
  `;

  const parts: any[] = [{ inlineData: { mimeType: 'image/jpeg', data: charBase64 } }];
  if (styleBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
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
  if (!text) throw new Error("Variation strategy failed.");
  const campaign = JSON.parse(text) as AdCampaign;
  campaign.id = newId;

  const imgParts: any[] = [{ inlineData: { mimeType: 'image/jpeg', data: charBase64 } }];
  if (styleBase64) imgParts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
  imgParts.push({ text: `RENDER VARIATION: ${campaign.imagePrompt}` });

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
