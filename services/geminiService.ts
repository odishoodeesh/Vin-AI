
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AdCampaign, AdGenerationResponse } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Creates a fresh AI client instance. 
 * As per instructions, we create a new instance before each call 
 * to ensure it picks up the latest key from the selection dialog.
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
  imageB64: string,
  style: string,
  onProgress: (index: number) => void
): Promise<AdGenerationResponse> => {
  const ai = getAIClient();
  const base64Data = imageB64.split(',')[1] || imageB64;
  
  const styleInstruction = style === 'Random' 
    ? "various diverse high-end professional lifestyle settings" 
    : `specifically centered around the elite professional theme: "${style}"`;

  // We use gemini-3-pro-preview with a thinking budget for superior creative strategy
  const strategyPrompt = `
    Act as a world-class High-Fashion Creative Director. 
    1. Analyze the character in this image for brand DNA, aesthetic, and demographic appeal.
    2. Create a "Influencer Brand Identity" summary (1-2 sentences).
    3. Create 5 professional ad concepts optimized for Instagram/TikTok. The ads must be ${styleInstruction}.
    
    Each concept must have:
    - A 'title' (The campaign name)
    - A 'platform' (Reels, TikTok, or YouTube Shorts)
    - A 'hook' (The opening text overlay)
    - A 'caption' (Engaging marketing copy with hashtags)
    - A 'visualConcept' (Description of the scene)
    - A 'tone' (e.g., Luxury, Relatable, High-Energy)
    - A 'imagePrompt': A detailed technical prompt for an image model. Describe the EXACT character from the reference photo in the new setting. Include technical specs: "8k, professional photography, cinematic lighting, shot on 35mm, realistic skin textures, 9:16 aspect ratio".
    
    CRITICAL: Ensure the character's facial features and signature hair from the photo are preserved.
  `;

  const strategyResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: strategyPrompt },
      ],
    },
    config: {
      // Use thinking budget for better reasoning
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
  
  // We generate images sequentially to avoid burst limit errors on Vercel/Gemini API
  for (let i = 0; i < result.campaigns.length; i++) {
    onProgress(i);
    const campaign = result.campaigns[i];
    
    if (i > 0) await sleep(500); // Tiny pause between generations

    try {
      // Use gemini-3-pro-image-preview for professional 1K quality
      const imageResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: `GENERATE AD IMAGE: ${campaign.imagePrompt}. Ensure the subject is the same person as the provided reference image. HIGH QUALITY ADVERT.` }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "9:16",
            imageSize: "1K"
          }
        }
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
      console.error(`Failed to generate high-res image for campaign ${i}`, err);
      campaignsWithImages.push(campaign);
    }
  }

  return {
    ...result,
    campaigns: campaignsWithImages
  };
};

export const generateSingleAdCampaign = async (
  imageB64: string,
  style: string,
  newId: number
): Promise<AdCampaign> => {
  const ai = getAIClient();
  const base64Data = imageB64.split(',')[1] || imageB64;

  const strategyPrompt = `
    Create ONE premium ad concept. Theme: ${style}. Output JSON for one campaign object.
  `;

  const strategyResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: strategyPrompt },
      ],
    },
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

  const imageResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: `PROFESSIONAL AD: ${campaign.imagePrompt}. Reference character must be preserved.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "9:16",
        imageSize: "1K"
      }
    }
  }));

  const imagePart = imageResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (imagePart?.inlineData) {
    campaign.imageUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
  }

  return campaign;
};
