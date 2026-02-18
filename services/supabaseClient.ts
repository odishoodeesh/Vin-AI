import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cnjncgjlvnsceqtcsxkd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuam5jZ2psdm5zY2VxdGNzeGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDUyNDUsImV4cCI6MjA4Njk4MTI0NX0._ArHGyTZfgOOOyDWoUz0MnGZl_ZlLhruNALdQdUzHNs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SavedCampaign {
  id?: string;
  created_at?: string;
  influencer_analysis: string;
  campaigns: any;
  character_image: string;
  style_name: string;
}

export const saveCampaign = async (data: SavedCampaign) => {
  const { error } = await supabase
    .from('campaigns')
    .insert([data]);
  return { error };
};

export const getPastCampaigns = async () => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  return { data, error };
};