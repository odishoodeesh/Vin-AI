import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AdCampaign, AdGenerationResponse } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || JSON.stringify(err);
      
      const isRetryable = 
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') || 
        errorMsg.includes('500') || 
        errorMsg.includes('fetch failed') ||
        errorMsg.includes('NetworkError');
      
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

const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const generateAdCampaigns = async (
  characterImageB64: string,
  styleImageB64: string | null,
  styleName: string,
  onProgress: (index: number) => void
): Promise<AdGenerationResponse> => {
  const ai = getAIClient();
  const charBase64 = characterImageB64.includes(',') ? characterImageB64.split(',')[1] : characterImageB64;
  const styleBase64 = styleImageB64 ? (styleImageB64.includes(',') ? styleImageB64.split(',')[1] : styleImageB64) : null;
  
  const strategyPrompt = `
    Act as a professional Creative Director. 
    1. Analyze the character image.
    2. Develop a premium influencer campaign strategy.
    3. The collection theme is: "${styleName}". 
    ${styleBase64 ? "Incorporate the visual vibe and lighting from the second image." : ""}

    Generate 5 concepts in JSON.
    - 'imagePrompt': Detailed prompt for image generation. Include: "9:16 vertical, high-end commercial fashion, cinematic lighting, ultra-detailed skin".
    - Rule: Subject must exactly match the first reference photo identity.
  `;

  const parts: any[] = [
    { inlineData: { mimeType: 'image/jpeg', data: charBase64 } },
  ];
  if (styleBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
  }
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
  if (!strategyText) throw new Error("Strategy Engine: No content returned. The image might have been flagged or the prompt was too complex.");
  
  const result = JSON.parse(cleanJson(strategyText)) as AdGenerationResponse;

  const campaignsWithImages: AdCampaign[] = [];
  for (let i = 0; i < result.campaigns.length; i++) {
    onProgress(i);
    const campaign = result.campaigns[i];
    
    if (i > 0) await sleep(800);

    try {
      const imgParts: any[] = [
        { inlineData: { mimeType: 'image/jpeg', data: charBase64 } }
      ];
      if (styleBase64) {
        imgParts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
      }
      imgParts.push({ text: `PHOTO-REALISTIC RENDER: ${campaign.imagePrompt}. Ensure subject identity matches the first image perfectly.` });

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
      console.warn(`Asset #${i} rendering failed:`, err);
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
  const charBase64 = characterImageB64.includes(',') ? characterImageB64.split(',')[1] : characterImageB64;
  const styleBase64 = styleImageB64 ? (styleImageB64.includes(',') ? styleImageB64.split(',')[1] : styleImageB64) : null;

  const strategyPrompt = `Generate ONE high-converting ad concept in JSON for: "${styleName}". Use reference 1 for identity.`;

  const parts: any[] = [{ inlineData: { mimeType: 'image/jpeg', data: charBase64 } }];
  if (styleBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
  parts.push({ text: strategyPrompt });

  const strategyResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts },
    config: {
      thinkingBudget: 8192,
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
  const campaign = JSON.parse(cleanJson(text)) as AdCampaign;
  campaign.id = newId;

  const imgParts: any[] = [{ inlineData: { mimeType: 'image/jpeg', data: charBase64 } }];
  if (styleBase64) imgParts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
  imgParts.push({ text: `BOUTIQUE AD RENDER: ${campaign.imagePrompt}` });

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