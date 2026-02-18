
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AdCampaign, AdGenerationResponse } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Creates a fresh AI client instance. 
 * Invoked per-call to ensure it picks up the latest key injected by the selection dialog
 * in production environments like Vercel.
 */
const getAIClient = () => {
  // Use process.env.API_KEY directly as required by the guidelines
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Wraps an API call with retry logic specifically for Vercel production workloads.
 * Handles rate limits (429) and transient fetch errors gracefully.
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || JSON.stringify(err);
      
      // Retryable errors for cloud deployments
      const isRetryable = 
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') || 
        errorMsg.includes('500') || 
        errorMsg.includes('fetch failed') ||
        errorMsg.includes('NetworkError');
      
      if (isRetryable && i < maxRetries - 1) {
        // Exponential backoff
        const delay = (i + 1) * 2000 + Math.random() * 1000;
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
  // 1. Create client per-session for key reactivity
  const ai = getAIClient();
  const charBase64 = characterImageB64.split(',')[1] || characterImageB64;
  const styleBase64 = styleImageB64 ? (styleImageB64.split(',')[1] || styleImageB64) : null;
  
  const strategyPrompt = `
    Act as a world-class High-Fashion Creative Director and Lead Marketing Strategist. 
    1. Analyze the FIRST image for unique character identity, facial features, and brand aesthetic.
    2. Develop a premium influencer campaign strategy for this creator.
    3. The collection theme is: "${styleName}". 
    ${styleBase64 ? "MANDATORY: Replicate the EXACT visual vibe, lighting, and textures from the SECOND image." : ""}

    Generate 5 concept objects in JSON. Each must have:
    - 'title', 'platform', 'audience', 'hook', 'caption', 'visualConcept', 'tone'
    - 'imagePrompt': Detailed technical prompt. Must include: "9:16 vertical, high-end commercial fashion photography, cinematic lighting, ultra-detailed skin textures".
    - IDENTITY RULE: State subject must be identical to reference photo 1.
  `;

  const parts: any[] = [
    { inlineData: { mimeType: 'image/jpeg', data: charBase64 } },
  ];
  if (styleBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
  }
  parts.push({ text: strategyPrompt });

  // STEP 1: Deep Reasoning with Gemini 3 Pro
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
  if (!strategyText) throw new Error("Agency strategy engine failed to respond.");
  const result = JSON.parse(strategyText) as AdGenerationResponse;

  // STEP 2: Sequential High-Fidelity Rendering
  // This approach ensures stability on Vercel and keeps browser requests healthy.
  const campaignsWithImages: AdCampaign[] = [];
  for (let i = 0; i < result.campaigns.length; i++) {
    // Notify UI of start of specific campaign generation
    onProgress(i);
    const campaign = result.campaigns[i];
    
    // Stabilize interval
    if (i > 0) await sleep(500);

    try {
      const imgParts: any[] = [
        { inlineData: { mimeType: 'image/jpeg', data: charBase64 } }
      ];
      if (styleBase64) {
        imgParts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
      }
      imgParts.push({ text: `RENDER HIGH-FIDELITY AD: ${campaign.imagePrompt}. Subject MUST match reference 1 identity.` });

      // Gemini 2.5 Flash Image for maximum speed and compatibility
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
      console.error(`Asset rendering #${i} skipped due to system load.`, err);
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
    Create ONE premium ad variation. Theme: "${styleName}". 
    Respond in JSON matching the standard campaign schema.
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
  if (!text) throw new Error("Variation strategy engine timed out.");
  const campaign = JSON.parse(text) as AdCampaign;
  campaign.id = newId;

  const imgParts: any[] = [{ inlineData: { mimeType: 'image/jpeg', data: charBase64 } }];
  if (styleBase64) imgParts.push({ inlineData: { mimeType: 'image/jpeg', data: styleBase64 } });
  imgParts.push({ text: `RENDER BOUTIQUE AD: ${campaign.imagePrompt}` });

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
