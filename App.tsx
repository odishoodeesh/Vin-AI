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
      // Check for presence of key selector as per instructions
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Fallback to process.env if selector not available
        setHasKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      // Trigger the selection dialog
      await window.aistudio.openSelectKey();
      // MANDATORY: Mitigate race condition by assuming success after trigger
      setHasKey(true);
      setError(null);
      showNotification("Agency key successfully linked!", 'success');
    }
  };

  const handleUpload = useCallback(async (charBase64: string, styleBase64: string | null, style: string) => {
    if (!hasKey) {
      setError("Please initialize your agency key to unlock high-fidelity rendering.");
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
      // Specific error handling as per guidelines
      if (msg.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("API Key verification failed (404). Please re-initialize your key.");
      } else if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
        setError("Access Denied (403). Ensure your selected billing project has Gemini 3/2.5 enabled.");
      } else if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        setError("Rate limit reached. Please pause for 60 seconds or upgrade to a paid project.");
      } else {
        setError("The studio encountered a processing error. Please refresh and try again.");
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
      showNotification(`Variation #${nextId} rendered!`, 'success');
    } catch (err: any) {
      showNotification("Quota limit reached. Try again in 1 minute.", 'error');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleConnectReel = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsReelConnected(true);
      setIsConnecting(false);
      showNotification("Verified Creator Hub synced!", 'success');
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

  // GATEWAY: Force key selection if not present
  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center selection:bg-brand-lime/30">
        <div className="max-w-md w-full space-y-12 p-12 bg-[#0d0e0c] border border-white/5 rounded-[4rem] shadow-4xl animate-scale-in">
          <LogoStripe className="w-24 h-24 mx-auto rounded-3xl" />
          <div className="space-y-6">
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Agency Access Required</h2>
            <p className="text-gray-500 text-sm leading-relaxed font-medium">
              Vin AI utilizes elite Gemini 3 Pro models for deep marketing reasoning. A billing-enabled API key is mandatory for full 8K rendering capabilities.
            </p>
          </div>
          <div className="space-y-4 pt-4">
            <button 
              onClick={handleSelectKey}
              className="w-full bg-brand-lime text-black py-5 rounded-full font-black text-xs uppercase tracking-[0.3em] hover:brightness-110 transition-all shadow-2xl shadow-brand-lime/10 active:scale-95"
            >
              Initialize Agency Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-[10px] text-gray-600 hover:text-brand-lime underline uppercase tracking-[0.3em] transition-colors font-bold"
            >
              Developer Billing Guide
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg selection:bg-brand-lime/30 relative text-white bg-[#0d0e0c]">
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-8 py-5 rounded-[2.5rem] shadow-4xl border backdrop-blur-3xl flex items-center gap-4 animate-scale-in ${
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
              <h1 className="text-2xl font-black tracking-tighter leading-none uppercase">Vin <span className="text-brand-lime">AI</span></h1>
              <span className="text-[8px] font-black tracking-[0.4em] text-gray-500 uppercase">Agency Dashboard</span>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            {!isReelConnected ? (
              <button 
                onClick={handleConnectReel}
                disabled={isConnecting}
                className="bg-white/5 border border-white/10 hover:border-brand-lime/50 px-8 py-3 rounded-full transition-all text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-3 active:scale-95"
              >
                {isConnecting ? (
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                {isConnecting ? 'Authenticating...' : 'Sync Social Hub'}
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-brand-lime/10 border border-brand-lime/20 px-6 py-3 rounded-full">
                <div className="w-2 h-2 rounded-full bg-brand-lime animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-lime">Live Account: @Creator</span>
              </div>
            )}
            
            {uploadedChar && !isProcessing && (
              <button 
                onClick={reset}
                className="text-[10px] font-black uppercase tracking-widest bg-brand-lime text-black px-8 py-3 rounded-full hover:brightness-110 transition-all shadow-2xl shadow-brand-lime/10 active:scale-95"
              >
                Start New Session
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-20">
        {!uploadedChar ? (
          <div className="text-center py-24 space-y-16">
            <div className="space-y-8">
              <div className="inline-block px-8 py-2 rounded-full bg-brand-lime/10 border border-brand-lime/20 text-brand-lime text-[11px] font-black uppercase tracking-[0.4em]">
                Enterprise Creative Intelligence
              </div>
              <h2 className="text-[clamp(3rem,8vw,6rem)] font-black tracking-tighter leading-[0.85] max-w-5xl mx-auto uppercase">
                Campaign <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-lime via-brand-sage to-brand-cream">Autonomous</span>
              </h2>
              <p className="text-gray-500 text-xl max-w-3xl mx-auto leading-relaxed font-medium">
                The world's most powerful creative engine for AI influencers. Powered by Gemini 3 Pro reasoning and 2.5 Flash High-Speed rendering.
              </p>
            </div>
            <UploadArea onUpload={handleUpload} isProcessing={isProcessing} />
          </div>
        ) : (
          <div className="space-y-24 animate-scale-in">
            {/* Strategy Dashboard */}
            <div className="bg-[#121411] border border-white/5 p-12 rounded-[4rem] shadow-4xl relative overflow-hidden group">
              <div className="flex flex-col md:flex-row gap-16 items-start relative z-10">
                <div className="w-full md:w-80 shrink-0 flex flex-col gap-8">
                  <div className="relative aspect-[9/16] rounded-[3.5rem] overflow-hidden ring-1 ring-white/10 shadow-4xl bg-black">
                    <img src={uploadedChar} alt="Character" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                      <div className="px-4 py-1.5 bg-brand-lime text-black text-[10px] font-black rounded-full uppercase inline-block">Brand Identity</div>
                    </div>
                  </div>
                  {uploadedStyleRef && (
                    <div className="relative aspect-[9/16] rounded-[2.5rem] overflow-hidden ring-1 ring-white/10 shadow-3xl h-48 md:h-auto bg-black transition-transform duration-700 group-hover:scale-105">
                      <img src={uploadedStyleRef} alt="Style" className="w-full h-full object-cover opacity-70" />
                      <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                        <div className="px-4 py-1.5 bg-brand-sage text-white text-[10px] font-black rounded-full uppercase inline-block">Visual Reference</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-12 pt-4">
                  <div className="space-y-6">
                    <div className="flex items-center gap-6">
                      <h3 className="text-6xl font-black tracking-tighter uppercase leading-none">Neural<br/>Strategy</h3>
                      <div className="px-6 py-2.5 bg-brand-lime/10 border border-brand-lime/20 rounded-full text-brand-lime text-[12px] font-black uppercase tracking-widest self-start">
                        {selectedStyle}
                      </div>
                    </div>
                    {isProcessing && (
                      <div className="flex items-center gap-4">
                         <div className="flex gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-bounce"></span>
                         </div>
                         <p className="text-brand-lime/60 text-[11px] font-black uppercase tracking-[0.5em] animate-pulse">Deep Reasoning (16k Thinking Budget Active)</p>
                      </div>
                    )}
                  </div>
                  
                  {isProcessing ? (
                    <div className="space-y-10 max-w-2xl">
                      <div className="h-2.5 bg-white/5 rounded-full w-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-brand-lime transition-all duration-1000 ease-in-out shadow-[0_0_20px_rgba(148,189,68,0.4)]" 
                          style={{ width: `${((progressIndex + 0.5) / 5) * 100}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-3">
                          <p className="text-white text-[12px] font-black uppercase tracking-[0.3em]">System Step</p>
                          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                            {progressIndex === 0 ? "Analyzing Brand DNA..." : `Rendering Concept ${progressIndex}/5`}
                          </p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-white text-[12px] font-black uppercase tracking-[0.3em]">Processing Engine</p>
                          <p className="text-brand-lime text-[11px] font-bold uppercase tracking-wider animate-pulse italic">Gemini 3 Pro + Vercel Edge</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-10">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-lime/30 rounded-full"></div>
                      <p className="text-gray-300 text-3xl leading-relaxed font-semibold italic opacity-90">
                        "{result?.influencerAnalysis}"
                      </p>
                    </div>
                  )}
                  
                  {error && (
                    <div className="p-10 bg-red-900/10 border border-red-500/20 rounded-[4rem] space-y-8 animate-pulse shadow-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <p className="text-red-400 text-xs font-black uppercase tracking-[0.4em]">Broadcast Interrupted</p>
                      </div>
                      <p className="text-red-400/90 text-sm leading-relaxed font-bold">{error}</p>
                      <button 
                        onClick={handleSelectKey}
                        className="text-[11px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 px-10 py-4 rounded-full border border-red-500/30 hover:bg-red-500/40 transition-all active:scale-95"
                      >
                        Re-Initialize Agency Key
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-64 -right-64 w-[50rem] h-[50rem] bg-brand-lime/5 blur-[180px] rounded-full group-hover:bg-brand-lime/10 transition-all duration-1000 ease-in-out pointer-events-none"></div>
            </div>

            {/* Content Gallery */}
            <div className="space-y-20">
              <div className="flex items-center justify-between border-b border-white/5 pb-12">
                <div className="space-y-3">
                  <h3 className="text-6xl font-black tracking-tighter uppercase leading-none">Campaign <span className="text-brand-lime">Vault</span></h3>
                  <p className="text-[11px] font-black text-gray-600 uppercase tracking-[0.6em]">Premium 8K Native Content Sequence</p>
                </div>
                {!isProcessing && result && (
                  <button 
                    onClick={handleGenerateMore}
                    disabled={isGeneratingMore}
                    className="group flex items-center gap-5 bg-white text-black px-12 py-5 rounded-full hover:bg-brand-lime transition-all text-[12px] font-black uppercase tracking-[0.3em] disabled:opacity-50 active:scale-95 shadow-4xl shadow-white/5"
                  >
                    {isGeneratingMore ? (
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                    )}
                    {isGeneratingMore ? 'Rendering...' : 'Add Campaign Variation'}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-12">
                {isProcessing && !result ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="aspect-[9/20] bg-white/5 rounded-[4rem] animate-pulse border border-white/5 flex flex-col p-10 space-y-8">
                       <div className="flex-1 bg-white/5 rounded-[3rem]"></div>
                       <div className="h-4 bg-white/5 rounded-full w-4/5"></div>
                       <div className="h-4 bg-white/5 rounded-full w-2/5"></div>
                    </div>
                  ))
                ) : (
                  result?.campaigns.map((campaign) => (
                    <AdCard 
                      key={campaign.id} 
                      campaign={campaign} 
                      isReelConnected={isReelConnected}
                      onPostSuccess={() => showNotification(`Broadcast #${campaign.id} is now Live`, 'success')}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-32 mt-32 bg-black/80 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-8 text-center space-y-16">
          <div className="flex flex-wrap justify-center gap-16 text-[12px] font-black uppercase tracking-[0.6em] text-gray-700">
             <span className="hover:text-brand-lime transition-colors cursor-default">Autonomous Intelligence</span>
             <span className="hover:text-brand-lime transition-colors cursor-default">8K Native Render</span>
             <span className="hover:text-brand-lime transition-colors cursor-default">Professional Dashboard</span>
          </div>
          <div className="space-y-4">
            <p className="text-gray-600 text-[12px] uppercase tracking-[0.4em] font-black">&copy; 2024 VIN AI • GLOBAL MARKETING CORE</p>
            <p className="text-gray-800 text-[10px] uppercase tracking-[0.5em] font-bold">Vercel Deployment Instance: {process.env.VERCEL_URL || 'PRJ-VIN-01'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
