import React, { useState, useCallback, useEffect } from 'react';
import { UploadArea } from './components/UploadArea';
import { AdCard } from './components/AdCard';
import { generateAdCampaigns, generateSingleAdCampaign } from './services/geminiService';
import { AdGenerationResponse, AdCampaign } from './types';
import { supabase, saveCampaign, getPastCampaigns, SavedCampaign } from './services/supabaseClient';

const LogoStripe = ({ className = "w-10 h-10" }) => (
  <div className={`${className} flex overflow-hidden rounded-lg shadow-xl`}>
    <div className="h-full flex-1 bg-[#94bd44]"></div>
    <div className="h-full flex-1 bg-[#4d4d4d]"></div>
    <div className="h-full flex-1 bg-[#4b5e35]"></div>
    <div className="h-full flex-1 bg-[#ecf0e5]"></div>
    <div className="h-full flex-1 bg-[#8a8a8a]"></div>
    <div className="h-full flex-1 bg-[#8ba360]"></div>
    <div className="h-full flex-1 bg-[#6b7d4a]"></div>
  </div>
);

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [result, setResult] = useState<AdGenerationResponse | null>(null);
  const [uploadedChar, setUploadedChar] = useState<string | null>(null);
  const [uploadedStyleRef, setUploadedStyleRef] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('Random');
  const [error, setError] = useState<string | null>(null);
  const [isReelConnected, setIsReelConnected] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [pastCampaigns, setPastCampaigns] = useState<SavedCampaign[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await getPastCampaigns();
      if (data) setPastCampaigns(data);
    } catch (e) {
      console.warn("Supabase history unavailable");
    }
  };

  const handleUpload = useCallback(async (charBase64: string, styleBase64: string | null, style: string) => {
    setIsProcessing(true);
    setUploadedChar(charBase64);
    setUploadedStyleRef(styleBase64);
    setSelectedStyle(style);
    setProgressIndex(0);
    setError(null);
    try {
      const response = await generateAdCampaigns(charBase64, styleBase64, style, (idx) => setProgressIndex(idx + 1));
      setResult(response);
      
      try {
        await saveCampaign({
          influencer_analysis: response.influencerAnalysis,
          campaigns: response.campaigns,
          character_image: charBase64,
          style_name: style
        });
        loadHistory();
      } catch (dbErr) {
        console.warn("Could not persist campaign to history.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Creative Engine encountered an issue. Please try a different image or refresh.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleGenerateMore = async () => {
    if (!uploadedChar || !result) return;
    setIsGeneratingMore(true);
    try {
      const nextId = result.campaigns.length + 1;
      const newCampaign = await generateSingleAdCampaign(uploadedChar, uploadedStyleRef, selectedStyle, nextId);
      setResult(prev => {
        if (!prev) return prev;
        return { ...prev, campaigns: [...prev.campaigns, newCampaign] };
      });
      showNotification(`Asset #${nextId} Ready`, 'success');
    } catch (err: any) {
      showNotification("Rendering failed", 'error');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const reset = () => {
    setResult(null);
    setUploadedChar(null);
    setUploadedStyleRef(null);
    setError(null);
    setProgressIndex(0);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen gradient-bg relative text-white bg-[#050604] selection:bg-brand-lime/30 selection:text-black">
      {notification && (
        <div className={`fixed top-12 right-12 z-[100] px-10 py-6 rounded-[3rem] shadow-4xl glass-panel flex items-center gap-5 animate-scale-in border ${
          notification.type === 'success' ? 'border-brand-lime/30 text-brand-lime' : 'border-red-500/30 text-red-400'
        }`}>
          <div className={`w-3 h-3 rounded-full ${notification.type === 'success' ? 'bg-brand-lime animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-xs font-black uppercase tracking-[0.3em]">{notification.message}</span>
        </div>
      )}

      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-12 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6 group cursor-pointer" onClick={reset}>
            <LogoStripe className="w-12 h-12 group-hover:rotate-12 transition-transform duration-700" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tighter leading-none uppercase">Vin <span className="text-brand-lime italic">Agency</span></h1>
              <span className="text-[8px] font-black tracking-[0.6em] text-gray-600 uppercase">Pro Creative Core</span>
            </div>
          </div>
          
          <div className="flex items-center gap-10">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 hover:text-brand-lime transition-colors relative"
            >
              Archive
              {pastCampaigns.length > 0 && <span className="absolute -top-3 -right-4 w-5 h-5 bg-brand-lime/10 border border-brand-lime/20 rounded-full flex items-center justify-center text-[8px] text-brand-lime">{pastCampaigns.length}</span>}
            </button>
            <div className="h-10 w-px bg-white/10"></div>
            {uploadedChar && !isProcessing && (
              <button 
                onClick={reset}
                className="text-[10px] font-black uppercase tracking-[0.4em] bg-brand-lime text-black px-10 py-3.5 rounded-full hover:brightness-110 transition-all shadow-2xl shadow-brand-lime/10 active:scale-95"
              >
                Reset Studio
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* History Overlay */}
      {showHistory && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowHistory(false)}></div>
          <div className="w-[450px] bg-[#0d0e0c] h-full shadow-4xl p-16 animate-scale-in overflow-y-auto custom-scrollbar relative border-l border-white/5">
            <div className="flex justify-between items-center mb-16">
              <h3 className="text-xs font-black uppercase tracking-[0.5em] text-brand-lime">Agency Archive</h3>
              <button onClick={() => setShowHistory(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">✕</button>
            </div>
            <div className="grid grid-cols-1 gap-10">
              {pastCampaigns.length === 0 ? (
                <p className="text-gray-600 text-xs font-black uppercase tracking-widest text-center py-20">No campaigns stored</p>
              ) : (
                pastCampaigns.map((pc, idx) => (
                  <div 
                    key={idx} 
                    className="group cursor-pointer space-y-4"
                    onClick={() => {
                      setResult({ influencerAnalysis: pc.influencer_analysis, campaigns: pc.campaigns });
                      setUploadedChar(pc.character_image);
                      setSelectedStyle(pc.style_name);
                      setShowHistory(false);
                    }}
                  >
                    <div className="aspect-[9/16] rounded-[3rem] overflow-hidden border border-white/5 bg-black">
                      <img src={pc.character_image} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all duration-700" />
                    </div>
                    <div className="flex justify-between items-end px-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">{pc.style_name}</p>
                        <p className="text-[8px] text-gray-600 uppercase tracking-widest mt-1">{new Date(pc.created_at!).toLocaleDateString()}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full border border-brand-lime/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <svg className="w-4 h-4 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-12 py-24">
        {!uploadedChar ? (
          <div className="text-center py-32 space-y-20">
            <div className="space-y-10">
              <div className="inline-block px-10 py-3 rounded-full bg-brand-lime/10 border border-brand-lime/20 text-brand-lime text-[11px] font-black uppercase tracking-[0.6em] animate-pulse-slow">
                Autonomous Studio Engine v3.0
              </div>
              <h2 className="text-[clamp(4rem,10vw,8rem)] font-black tracking-tighter leading-[0.8] max-w-6xl mx-auto uppercase">
                Creator <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-lime via-brand-sage to-brand-cream italic">Monetization</span>
              </h2>
              <p className="text-gray-500 text-2xl max-w-3xl mx-auto leading-relaxed font-medium">
                Transform any identity into high-converting professional campaigns in seconds. Pro-grade consistency at scale.
              </p>
            </div>
            <UploadArea onUpload={handleUpload} isProcessing={isProcessing} />
          </div>
        ) : (
          <div className="space-y-32 animate-scale-in">
            {/* Control Panel */}
            <div className="bg-[#0d0e0c] border border-white/5 p-16 rounded-[4.5rem] shadow-4xl relative overflow-hidden group">
              <div className="flex flex-col md:flex-row gap-20 items-start relative z-10">
                <div className="w-full md:w-96 shrink-0">
                  <div className="relative aspect-[9/16] rounded-[4rem] overflow-hidden ring-1 ring-white/10 shadow-4xl bg-black">
                    <img src={uploadedChar} alt="Subject" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black via-black/40 to-transparent">
                      <div className="px-6 py-2 bg-brand-lime text-black text-[11px] font-black rounded-full uppercase tracking-widest inline-block shadow-xl">Identity Validated</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 space-y-16 pt-8">
                  <div className="space-y-8">
                    <div className="flex items-center gap-8">
                      <h3 className="text-7xl font-black tracking-tighter uppercase leading-[0.9]">Session<br/>Dashboard</h3>
                      <div className="px-8 py-3 bg-brand-lime/10 border border-brand-lime/20 rounded-full text-brand-lime text-[13px] font-black uppercase tracking-widest self-start">
                        {selectedStyle}
                      </div>
                    </div>
                  </div>
                  
                  {isProcessing ? (
                    <div className="space-y-12 max-w-2xl">
                      <div className="h-3 bg-white/5 rounded-full w-full overflow-hidden shadow-inner border border-white/5">
                        <div 
                          className="h-full bg-brand-lime transition-all duration-1000 ease-in-out shadow-[0_0_30px_rgba(148,189,68,0.5)]" 
                          style={{ width: `${((progressIndex + 0.5) / 5) * 100}%` }}
                        ></div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-brand-lime text-[11px] font-black uppercase tracking-[0.8em] animate-pulse">
                          {progressIndex === 0 ? "Analyzing Geometric Landmarks..." : `Baking High-Res Layer ${progressIndex}/5`}
                        </p>
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Utilizing 16K Reasoning Budget</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-12 border-l-4 border-brand-lime/20 py-4">
                      <p className="text-gray-300 text-4xl leading-tight font-semibold italic opacity-90 tracking-tight">
                        "{result?.influencerAnalysis}"
                      </p>
                    </div>
                  )}
                  
                  {error && (
                    <div className="p-10 bg-red-950/30 border border-red-500/20 rounded-[3rem] text-red-400 text-xs font-black uppercase tracking-[0.4em] leading-relaxed">
                      System Error: {error}
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -top-64 -left-64 w-[60rem] h-[60rem] bg-brand-lime/5 blur-[200px] rounded-full pointer-events-none group-hover:bg-brand-lime/10 transition-colors duration-1000"></div>
            </div>

            {/* Content Output */}
            <div className="space-y-24">
              <div className="flex items-end justify-between border-b border-white/5 pb-16">
                <div className="space-y-4">
                  <h3 className="text-7xl font-black tracking-tighter uppercase leading-none">Creative <span className="text-brand-lime italic">Output</span></h3>
                  <p className="text-[11px] font-black text-gray-600 uppercase tracking-[0.8em]">Optimized for Social Reach & Conversion</p>
                </div>
                {!isProcessing && result && (
                  <button 
                    onClick={handleGenerateMore}
                    disabled={isGeneratingMore}
                    className="flex items-center gap-6 bg-white text-black px-12 py-5 rounded-full hover:bg-brand-lime transition-all text-[12px] font-black uppercase tracking-[0.3em] active:scale-95 shadow-4xl shadow-white/5 group"
                  >
                    {isGeneratingMore ? (
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    )}
                    {isGeneratingMore ? 'Rendering...' : 'Add Variation'}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-12">
                {result?.campaigns.map((campaign) => (
                  <AdCard 
                    key={campaign.id} 
                    campaign={campaign} 
                    isReelConnected={isReelConnected}
                    onPostSuccess={() => showNotification(`Broadcast #${campaign.id} Live`, 'success')}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-32 mt-40 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-12 text-center space-y-10">
          <div className="flex flex-wrap justify-center gap-16 text-[11px] font-black uppercase tracking-[0.6em] text-gray-700">
            <span className="hover:text-brand-lime transition-colors">Neural Sync</span>
            <span className="hover:text-brand-lime transition-colors">Vercel Edge</span>
            <span className="hover:text-brand-lime transition-colors">Supabase Persistence</span>
          </div>
          <p className="text-gray-800 text-[10px] uppercase tracking-[0.8em] font-black">&copy; 2024 VIN AI AGENCY • ALL RIGHTS RESERVED</p>
        </div>
      </footer>
    </div>
  );
}

export default App;