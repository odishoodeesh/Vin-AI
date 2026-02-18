
import React, { useState, useCallback, useEffect } from 'react';
import { UploadArea } from './components/UploadArea';
import { AdCard } from './components/AdCard';
import { generateAdCampaigns, generateSingleAdCampaign } from './services/geminiService';
import { AdGenerationResponse, AdCampaign } from './types';

const LogoStripe = ({ className = "w-10 h-10" }) => (
  <div className={`${className} flex overflow-hidden rounded-lg shadow-lg`}>
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
      setError("Please select a billing-enabled API key to generate high-quality campaigns.");
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
        setError("API Key verification failed (404). Please re-select your key.");
      } else if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        setError("Quota exceeded (429). Switch to a paid billing project for uninterrupted generation.");
      } else {
        setError("System processing error. Please check your connection or try a different key.");
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
        return {
          ...prev,
          campaigns: [...prev.campaigns, newCampaign]
        };
      });
      showNotification(`Added variation #${nextId}`, 'success');
    } catch (err: any) {
      showNotification("Quota limit reached. Try again in a minute.", 'error');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleConnectReel = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsReelConnected(true);
      setIsConnecting(false);
      showNotification("Account @CreatorPro synced!", 'success');
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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 p-10 bg-[#0a0a0a] border border-brand-olive/20 rounded-[3rem] shadow-2xl">
          <LogoStripe className="w-24 h-24 mx-auto rounded-3xl" />
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-white tracking-tight">Agency Access Required</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              To generate professional ad campaigns, Vin AI requires a billing-enabled Gemini API key.
            </p>
          </div>
          <div className="space-y-4">
            <button 
              onClick={handleSelectKey}
              className="w-full bg-brand-lime text-black py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-brand-lime/10 active:scale-95"
            >
              Select Paid API Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-[10px] text-gray-500 hover:text-brand-lime underline uppercase tracking-widest transition-colors"
            >
              About Gemini Billing & API Keys
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg selection:bg-brand-lime/30 relative text-white">
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 animate-scale-in ${
          notification.type === 'success' ? 'bg-brand-lime/10 border-brand-lime/50 text-brand-lime' : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-brand-lime' : 'bg-red-500'}`}></div>
          <span className="text-sm font-bold tracking-tight">{notification.message}</span>
        </div>
      )}

      <nav className="border-b border-brand-olive/20 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={reset}>
            <LogoStripe className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <h1 className="text-xl font-black tracking-tighter">Vin <span className="text-brand-lime">AI</span></h1>
          </div>
          
          <div className="flex items-center gap-6">
            {!isReelConnected ? (
              <button 
                onClick={handleConnectReel}
                disabled={isConnecting}
                className="bg-[#111] border border-brand-olive/30 hover:border-brand-lime/50 px-6 py-2.5 rounded-full transition-all text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2"
              >
                {isConnecting ? 'Authenticating...' : 'Connect Socials'}
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-brand-lime/5 border border-brand-lime/20 px-5 py-2.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-lime">@Creator_Live</span>
              </div>
            )}
            
            {uploadedChar && !isProcessing && (
              <button 
                onClick={reset}
                className="text-[10px] font-black uppercase tracking-widest bg-brand-lime text-black px-6 py-2.5 rounded-full hover:brightness-110 transition-all"
              >
                New Studio
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!uploadedChar ? (
          <div className="text-center py-20 space-y-10">
            <div className="space-y-4">
              <div className="inline-block px-4 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/20 text-brand-lime text-[10px] font-black uppercase tracking-widest">
                AI Creative Studio
              </div>
              <h2 className="text-7xl font-black tracking-tighter leading-[0.9] max-w-4xl mx-auto">
                Turn your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-lime via-brand-sage to-brand-cream">Character</span> <br/>
                into a global campaign.
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
                Copy style, place, and fashion from reference photos. Preserve identity across all frames.
              </p>
            </div>
            <UploadArea onUpload={handleUpload} isProcessing={isProcessing} />
          </div>
        ) : (
          <div className="space-y-16 animate-scale-in">
            <div className="bg-[#11120f] border border-brand-olive/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
                <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
                  <div className="relative aspect-[9/16] rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-3xl shadow-brand-lime/5">
                    <img src={uploadedChar} alt="Character" className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-brand-lime text-black text-[8px] font-black rounded uppercase">IDENTITY</div>
                  </div>
                  {uploadedStyleRef && (
                    <div className="relative aspect-[9/16] rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-3xl shadow-brand-sage/5 h-32 md:h-auto">
                      <img src={uploadedStyleRef} alt="Style" className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-brand-sage text-white text-[8px] font-black rounded uppercase">STYLE REF</div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-5xl font-black tracking-tighter">Neural Analysis</h3>
                      <div className="px-3 py-1 bg-brand-lime/10 border border-brand-lime/20 rounded-full text-brand-lime text-[10px] font-black uppercase tracking-widest">
                        {selectedStyle}
                      </div>
                    </div>
                  </div>
                  
                  {isProcessing ? (
                    <div className="space-y-6 max-w-md">
                      <div className="h-1.5 bg-brand-olive/20 rounded-full w-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-lime transition-all duration-700 ease-in-out" 
                          style={{ width: `${(progressIndex / 5) * 100}%` }}
                        ></div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-white text-xs font-black uppercase tracking-widest">
                          {progressIndex === 0 ? "Analyzing Brand DNA..." : `Crafting Campaign ${progressIndex} of 5...`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xl leading-relaxed font-medium">
                      {result?.influencerAnalysis}
                    </p>
                  )}
                  
                  {error && (
                    <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-3xl space-y-4">
                      <p className="text-red-400 text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        System Interruption
                      </p>
                      <p className="text-red-400/80 text-xs leading-relaxed">{error}</p>
                      <button 
                        onClick={handleSelectKey}
                        className="text-[9px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 px-5 py-2.5 rounded-full border border-red-500/30 hover:bg-red-500/30 transition-all"
                      >
                        Change API Key
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-brand-lime/5 blur-[120px] rounded-full"></div>
            </div>

            <div className="space-y-12">
              <div className="flex items-center justify-between border-b border-brand-olive/20 pb-8">
                <h3 className="text-4xl font-black tracking-tighter uppercase">Campaign <span className="text-brand-lime">Vault</span></h3>
                {!isProcessing && result && (
                  <button 
                    onClick={handleGenerateMore}
                    disabled={isGeneratingMore}
                    className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-full hover:bg-brand-lime hover:text-black transition-all text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-50"
                  >
                    {isGeneratingMore ? 'Rendering...' : 'Add Creative'}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                {isProcessing && !result ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="aspect-[9/20] bg-brand-olive/5 rounded-3xl animate-pulse border border-brand-olive/10 flex flex-col p-6 space-y-4">
                       <div className="flex-1 bg-brand-olive/10 rounded-2xl"></div>
                       <div className="h-4 bg-brand-olive/10 rounded-full w-3/4"></div>
                       <div className="h-4 bg-brand-olive/10 rounded-full w-1/2"></div>
                    </div>
                  ))
                ) : (
                  result?.campaigns.map((campaign) => (
                    <AdCard 
                      key={campaign.id} 
                      campaign={campaign} 
                      isReelConnected={isReelConnected}
                      onPostSuccess={() => showNotification(`Campaign #${campaign.id} is Live!`, 'success')}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-brand-olive/20 py-20 mt-20 bg-black/40">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-8">
          <div className="flex justify-center gap-12 text-[10px] font-black uppercase tracking-[0.4em] text-brand-olive">
             <span className="hover:text-brand-lime transition-colors cursor-default">PREMIUM</span>
             <span className="hover:text-brand-lime transition-colors cursor-default">AUTONOMOUS</span>
             <span className="hover:text-brand-lime transition-colors cursor-default">CREATIVE</span>
          </div>
          <div className="space-y-2">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest font-black">&copy; 2024 VIN AI • GLOBAL MARKETING ENGINE</p>
            <p className="text-brand-olive text-[8px] uppercase tracking-widest">Powered by Gemini AI Technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
