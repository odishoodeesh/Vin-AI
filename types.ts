
export interface AdCampaign {
  id: number;
  title: string;
  platform: string;
  audience: string;
  hook: string;
  caption: string;
  visualConcept: string;
  tone: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface AdGenerationResponse {
  campaigns: AdCampaign[];
  influencerAnalysis: string;
}
