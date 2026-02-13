
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AdCampaign, AdGenerationResponse } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Wraps an API call with retry logic for 429 errors.
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || JSON.stringify(err);
      const isQuotaError = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED');
      
      if (isQuotaError && i < maxRetries - 1) {
        // Exponential backoff: 2s, 5s, 10s
        const delay = (i + 1) * 3000 + Math.random() * 1000;
        console.warn(`Quota exceeded (429), retrying in ${Math.round(delay)}ms (Attempt ${i + 1}/${maxRetries})...`);
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
    ? "various diverse professional settings" 
    : `specifically centered around the theme: "${style}"`;

  const strategyPrompt = `
    Act as a world-class creative director. Analyze this AI influencer character.
    Create 5 professional ad concepts. The ads should be ${styleInstruction}.
    
    For EACH concept, provide a highly detailed "imagePrompt" intended for an image generation model. 
    
    CRITICAL: 
    - The theme for all images must be: ${style}. 
    - The imagePrompt must describe the character from the attached image in this ${style} setting.
    - If style is 'Mirror selfie', describe the character holding a high-end smartphone in front of a mirror.
    - If style is 'Gym', focus on premium athletic gear and fitness settings.
    - If style is 'Gen Z outfit', focus on Y2K, baggy streetwear, and modern trend aesthetics.
    - If style is 'Coffee', focus on aesthetic cafes, latte art, and cozy morning vibes.
    - If style is 'Dress', focus on high-fashion evening gowns, elegant gala settings, and luxury red carpet aesthetics.
    - If style is 'Hotel room', focus on high-end boutique hotel suites, plush white linens, panoramic city views, and intimate, relaxed atmospheres.
    - If style is 'Sexy', focus on bold, sophisticated allure, sultry lighting, confident poses, and high-fashion glam photography.
    - If style is 'Disposable Cam', use keywords: 35mm film, direct flash, disposable camera vibes, vintage grain, dated timestamp, hard shadows, high contrast.
    - If style is 'Street Snap', use keywords: Candid motion, street photography, shot on iPhone, blurred urban background, realistic skin texture, mid-motion walking.
    - If style is 'Home Body', use keywords: Soft indoor lighting, messy/authentic domestic background, casual no-filter vibes, unedited look, relaxed morning pose.
    - If style is 'Golden Hour', use keywords: Sunset lighting, golden hour glow, backlit skin, warm color palette, soft lens flares, main character energy.
    - If style is 'Car Seat', use keywords: Car interior, side-window lighting, seatbelt, natural sunlight through glass, dramatic side-shadows, intimate frame.
    
    Ensure the prompt mentions maintaining the character's facial features and hair style from the reference image. 
    The goal is 9:16 "Story/Reels" style professional photography.
  `;

  // Fix: Explicitly typed response to resolve 'unknown' property errors
  const strategyResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: strategyPrompt },
      ],
    },
    config: {
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
                imagePrompt: { type: Type.STRING, description: "Detailed prompt for generating the ad image." }
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
  if (!strategyText) throw new Error("No strategy response from AI");
  const result = JSON.parse(strategyText) as AdGenerationResponse;

  const campaignsWithImages: AdCampaign[] = [];
  
  for (let i = 0; i < result.campaigns.length; i++) {
    onProgress(i);
    const campaign = result.campaigns[i];
    
    // Add a small delay between requests to avoid hitting immediate burst limits
    if (i > 0) await sleep(1000);

    try {
      // Fix: Explicitly typed response to resolve 'unknown' property errors
      const imageResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: `Create a professional 9:16 advertisement image. Concept: ${campaign.imagePrompt}. Subject must be the exact character from the reference image. Style: High-end professional photography, 8k, cinematic lighting.` }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "9:16"
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
      console.error(`Failed to generate image for campaign ${i}`, err);
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
    Act as a creative director. Analyze the character. Create ONE additional professional ad concept. 
    Theme: ${style}. 
    Output should be JSON for ONE campaign object.
    
    If theme is 'Disposable Cam', use keywords: 35mm film, direct flash, vintage grain.
    If theme is 'Street Snap', use keywords: Candid motion, urban, iPhone-look.
    If theme is 'Home Body', use keywords: Soft indoor, authentic domestic, casual.
    If theme is 'Golden Hour', use keywords: Sunset, backlit, warm glow.
    If theme is 'Car Seat', use keywords: Car interior, side-window sun, dramatic shadows.
  `;

  // Fix: Explicitly typed response to resolve 'unknown' property errors
  const strategyResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: strategyPrompt },
      ],
    },
    config: {
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
  if (!text) throw new Error("No strategy response from AI");
  const campaign = JSON.parse(text) as AdCampaign;
  campaign.id = newId;

  // Fix: Explicitly typed response to resolve 'unknown' property errors
  const imageResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        { text: `Create a professional 9:16 advertisement image. Concept: ${campaign.imagePrompt}. Subject must be the exact character from the reference image. High-end professional photography.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "9:16"
      }
    }
  }));

  const imagePart = imageResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (imagePart?.inlineData) {
    campaign.imageUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
  }

  return campaign;
};
