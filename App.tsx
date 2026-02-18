
import React, { useState, useCallback, useEffect } from 'react';
import { UploadArea } from './components/UploadArea';
import { AdCard } from './components/AdCard';
import { generateAdCampaigns, generateSingleAdCampaign } from './services/geminiService';
import { AdGenerationResponse, AdCampaign } from './types';

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        setHasKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
      setError(null);
      showNotification("Agency key activated!", 'success');
    }
  };

  const handleUpload = useCallback(async (charBase64: string, styleBase64: string | null, style: string) => {
    if (!hasKey) {
      setError("Please activate your agency key to access Pro rendering models.");
      return;
    }

    setIsProcessing(true);
    setUploadedChar(charBase64);
    setUploadedStyleRef(styleBase64);
    setSelectedStyle(style);
    setProgressIndex(0);
    setError(null);
    try {
      const response = await generateAdCampaigns(charBase64, styleBase64, style, (idx) => setProgressIndex(idx + 1));
      setResult(response);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || JSON.stringify(err);
      if (msg.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("API Key verification failed. Please re-select your key.");
      } else if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
        setError("Permission Denied. Your selected project requires active billing for Pro models.");
      } else if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        setError("Vercel Rate Limit. Please wait 60s or use a paid billing key.");
      } else {
        setError("Studio session interrupted. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [hasKey]);

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
      showNotification(`Added variation #${nextId}`, 'success');
    } catch (err: any) {
      showNotification("Limit reached.", 'error');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleConnectReel = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsReelConnected(true);
      setIsConnecting(false);
      showNotification("Connected to Creator Studio!", 'success');
    }, 1500);
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
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center selection:bg-brand-lime/30">
        <div className="max-w-md w-full space-y-10 p-12 bg-[#0d0e0c] border border-white/5 rounded-[4rem] shadow-3xl">
          <LogoStripe className="w-24 h-24 mx-auto rounded-3xl" />
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Agency Key</h2>
            <p className="text-gray-500 text-sm leading-relaxed font-medium">
              Vin AI runs on high-performance Gemini 3 Pro models. To maintain 8K quality and 16k reasoning, a paid API key is required.
            </p>
          </div>
          <div className="space-y-4 pt-4">
            <button 
              onClick={handleSelectKey}
              className="w-full bg-brand-lime text-black py-5 rounded-full font-black text-xs uppercase tracking-[0.3em] hover:brightness-110 transition-all shadow-2xl shadow-brand-lime/10 active:scale-95"
            >
              Initialize Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-[10px] text-gray-600 hover:text-brand-lime underline uppercase tracking-[0.2em] transition-colors font-bold"
            >
              Gemini Billing Guide
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg selection:bg-brand-lime/30 relative text-white bg-[#0d0e0c]">
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-8 py-5 rounded-[2rem] shadow-3xl border backdrop-blur-3xl flex items-center gap-4 animate-scale-in ${
          notification.type === 'success' ? 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <div className={`w-3 h-3 rounded-full ${notification.type === 'success' ? 'bg-brand-lime' : 'bg-red-500'}`}></div>
          <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
        </div>
      )}

      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-3xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-5 group cursor-pointer" onClick={reset}>
            <LogoStripe className="w-12 h-12 group-hover:scale-110 transition-transform duration-500" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tighter leading-none">Vin <span className="text-brand-lime">AI</span></h1>
              <span className="text-[8px] font-black tracking-[0.4em] text-gray-500 uppercase">Agency Edition</span>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            {!isReelConnected ? (
              <button 
                onClick={handleConnectReel}
                disabled={isConnecting}
                className="bg-white/5 border border-white/10 hover:border-brand-lime/50 px-8 py-3 rounded-full transition-all text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-3"
              >
                {isConnecting ? (
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                {isConnecting ? 'Linking...' : 'Sync Channels'}
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-brand-lime/10 border border-brand-lime/20 px-6 py-3 rounded-full">
                <div className="w-2 h-2 rounded-full bg-brand-lime animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-lime">Live Hub: @Creator</span>
              </div>
            )}
            
            {uploadedChar && !isProcessing && (
              <button 
                onClick={reset}
                className="text-[10px] font-black uppercase tracking-widest bg-brand-lime text-black px-8 py-3 rounded-full hover:brightness-110 transition-all shadow-xl shadow-brand-lime/10"
              >
                Reset Studio
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-16">
        {!uploadedChar ? (
          <div className="text-center py-24 space-y-12">
            <div className="space-y-6">
              <div className="inline-block px-6 py-2 rounded-full bg-brand-lime/10 border border-brand-lime/20 text-brand-lime text-[10px] font-black uppercase tracking-[0.4em]">
                Vercel Optimized Engine
              </div>
              <h2 className="text-8xl font-black tracking-tighter leading-[0.85] max-w-5xl mx-auto uppercase">
                Campaign <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-lime via-brand-sage to-brand-cream">Autonomous</span>
              </h2>
              <p className="text-gray-500 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                The world's most advanced creative director for AI influencers. Powered by Gemini 3 Pro and 2.5 Flash Image.
              </p>
            </div>
            <UploadArea onUpload={handleUpload} isProcessing={isProcessing} />
          </div>
        ) : (
          <div className="space-y-20 animate-scale-in">
            <div className="bg-[#121411] border border-white/5 p-12 rounded-[4rem] shadow-4xl relative overflow-hidden group">
              <div className="flex flex-col md:flex-row gap-16 items-start relative z-10">
                <div className="w-full md:w-72 shrink-0 flex flex-col gap-6">
                  <div className="relative aspect-[9/16] rounded-[3rem] overflow-hidden ring-1 ring-white/10 shadow-3xl bg-black">
                    <img src={uploadedChar} alt="Character" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="px-3 py-1 bg-brand-lime text-black text-[9px] font-black rounded-full uppercase inline-block">IDENTITY</div>
                    </div>
                  </div>
                  {uploadedStyleRef && (
                    <div className="relative aspect-[9/16] rounded-[2rem] overflow-hidden ring-1 ring-white/10 shadow-2xl h-40 md:h-auto bg-black">
                      <img src={uploadedStyleRef} alt="Style" className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <div className="px-3 py-1 bg-brand-sage text-white text-[9px] font-black rounded-full uppercase inline-block">VIBE REF</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-5">
                      <h3 className="text-6xl font-black tracking-tighter uppercase leading-none">Creative <br/>Strategy</h3>
                      <div className="px-5 py-2 bg-brand-lime/10 border border-brand-lime/20 rounded-full text-brand-lime text-[11px] font-black uppercase tracking-widest self-start">
                        {selectedStyle}
                      </div>
                    </div>
                    {isProcessing && (
                      <div className="flex items-center gap-3">
                         <div className="flex gap-1">
                            <span className="w-1 h-1 rounded-full bg-brand-lime animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1 h-1 rounded-full bg-brand-lime animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1 h-1 rounded-full bg-brand-lime animate-bounce"></span>
                         </div>
                         <p className="text-brand-lime/60 text-[10px] font-black uppercase tracking-[0.4em]">Reasoning (16k Thinking Budget Active)</p>
                      </div>
                    )}
                  </div>
                  
                  {isProcessing ? (
                    <div className="space-y-8 max-w-xl">
                      <div className="h-2 bg-white/5 rounded-full w-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-lime transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(148,189,68,0.5)]" 
                          style={{ width: `${((progressIndex + 0.5) / 5) * 100}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <p className="text-white text-[11px] font-black uppercase tracking-[0.2em]">Step</p>
                          <p className="text-gray-500 text-[10px] font-bold uppercase">
                            {progressIndex === 0 ? "Neural Brand Analysis" : `Asset Generation ${progressIndex}/5`}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-white text-[11px] font-black uppercase tracking-[0.2em]">Status</p>
                          <p className="text-brand-lime text-[10px] font-bold uppercase animate-pulse">Running Pro 3.0</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute -left-6 top-0 bottom-0 w-1 bg-brand-lime/20 rounded-full"></div>
                      <p className="text-gray-400 text-2xl leading-relaxed font-semibold italic">
                        "{result?.influencerAnalysis}"
                      </p>
                    </div>
                  )}
                  
                  {error && (
                    <div className="p-8 bg-red-900/10 border border-red-500/20 rounded-[3rem] space-y-6 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <p className="text-red-400 text-xs font-black uppercase tracking-[0.3em]">System Interruption</p>
                      </div>
                      <p className="text-red-400/80 text-[11px] leading-relaxed font-bold">{error}</p>
                      <button 
                        onClick={handleSelectKey}
                        className="text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 px-8 py-3 rounded-full border border-red-500/30 hover:bg-red-500/30 transition-all"
                      >
                        Reset Agency Key
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-48 -right-48 w-[40rem] h-[40rem] bg-brand-lime/5 blur-[160px] rounded-full group-hover:bg-brand-lime/10 transition-all duration-1000"></div>
            </div>

            <div className="space-y-16">
              <div className="flex items-center justify-between border-b border-white/5 pb-10">
                <div className="space-y-1">
                  <h3 className="text-5xl font-black tracking-tighter uppercase">Campaign <span className="text-brand-lime">Vault</span></h3>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em]">5 Premium Native Assets Rendered</p>
                </div>
                {!isProcessing && result && (
                  <button 
                    onClick={handleGenerateMore}
                    disabled={isGeneratingMore}
                    className="group flex items-center gap-4 bg-white text-black px-10 py-4 rounded-full hover:bg-brand-lime transition-all text-[11px] font-black uppercase tracking-[0.25em] disabled:opacity-50 active:scale-95 shadow-2xl shadow-white/5"
                  >
                    {isGeneratingMore ? (
                      <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                    )}
                    {isGeneratingMore ? 'Rendering...' : 'Add Variation'}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-10">
                {isProcessing && !result ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="aspect-[9/20] bg-white/5 rounded-[3rem] animate-pulse border border-white/5 flex flex-col p-8 space-y-6">
                       <div className="flex-1 bg-white/5 rounded-[2rem]"></div>
                       <div className="h-3 bg-white/5 rounded-full w-4/5"></div>
                       <div className="h-3 bg-white/5 rounded-full w-3/5"></div>
                    </div>
                  ))
                ) : (
                  result?.campaigns.map((campaign) => (
                    <AdCard 
                      key={campaign.id} 
                      campaign={campaign} 
                      isReelConnected={isReelConnected}
                      onPostSuccess={() => showNotification(`Broadcast #${campaign.id} Live`, 'success')}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-24 mt-24 bg-black/60">
        <div className="max-w-7xl mx-auto px-8 text-center space-y-12">
          <div className="flex justify-center gap-16 text-[11px] font-black uppercase tracking-[0.5em] text-gray-700">
             <span className="hover:text-brand-lime transition-colors cursor-default">Autonomous</span>
             <span className="hover:text-brand-lime transition-colors cursor-default">8K Native</span>
             <span className="hover:text-brand-lime transition-colors cursor-default">Pro Agent</span>
          </div>
          <div className="space-y-3">
            <p className="text-gray-600 text-[11px] uppercase tracking-widest font-black">&copy; 2024 VIN AI CREATIVE • LONDON HQ</p>
            <p className="text-gray-800 text-[9px] uppercase tracking-[0.3em] font-bold">Optimized for Vercel Deployment ID: {process.env.VERCEL_URL || 'PRJ-VIN-01'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
