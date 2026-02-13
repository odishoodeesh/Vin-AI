
import React, { useState, useCallback, useEffect } from 'react';
import { UploadArea } from './components/UploadArea';
import { AdCard } from './components/AdCard';
import { generateAdCampaigns, generateSingleAdCampaign } from './services/geminiService';
import { AdGenerationResponse, AdCampaign } from './types';

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [result, setResult] = useState<AdGenerationResponse | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
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
        // Fallback for non-aistudio environments if key is in process.env
        setHasKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success after trigger as per instructions
      setHasKey(true);
      showNotification("Agency key activated!", 'success');
    }
  };

  const handleUpload = useCallback(async (base64: string, style: string) => {
    if (!hasKey) {
      setError("Please select a billing-enabled API key to generate high-quality campaigns.");
      return;
    }

    setIsProcessing(true);
    setUploadedImage(base64);
    setSelectedStyle(style);
    setProgressIndex(0);
    setError(null);
    try {
      const response = await generateAdCampaigns(base64, style, (idx) => setProgressIndex(idx + 1));
      setResult(response);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || JSON.stringify(err);
      if (msg.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("API Key verification failed. Please re-select your key.");
      } else if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        setError("Quota exceeded. Switch to a paid billing project for uninterrupted generation.");
      } else {
        setError("Failed to process creative strategy. Please check your connection and try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [hasKey]);

  const handleGenerateMore = async () => {
    if (!uploadedImage || !result) return;
    setIsGeneratingMore(true);
    try {
      const nextId = result.campaigns.length + 1;
      const newCampaign = await generateSingleAdCampaign(uploadedImage, selectedStyle, nextId);
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
    setUploadedImage(null);
    setError(null);
    setProgressIndex(0);
  };

  // Mandatory Key Selection Gateway for high-quality Pro models
  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 p-10 bg-[#0a0a0a] border border-gray-800 rounded-[3rem] shadow-2xl">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-4xl font-black shadow-2xl shadow-indigo-600/20">V</div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-white tracking-tight">Agency Access Required</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              To generate 5 professional 1K resolution ad campaigns, Vin AI requires a billing-enabled Gemini API key.
            </p>
          </div>
          <div className="space-y-4">
            <button 
              onClick={handleSelectKey}
              className="w-full bg-white text-black py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95"
            >
              Select Paid API Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-[10px] text-gray-500 hover:text-indigo-400 underline uppercase tracking-widest transition-colors"
            >
              About Gemini Billing & API Keys
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] selection:bg-indigo-500/30 relative text-white">
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 animate-scale-in ${
          notification.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-bold tracking-tight">{notification.message}</span>
        </div>
      )}

      <nav className="border-b border-gray-900 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/10 group-hover:scale-110 transition-transform">V</div>
            <h1 className="text-xl font-black tracking-tighter">Vin <span className="text-indigo-500">AI</span></h1>
          </div>
          
          <div className="flex items-center gap-6">
            {!isReelConnected ? (
              <button 
                onClick={handleConnectReel}
                disabled={isConnecting}
                className="bg-[#111] border border-gray-800 hover:border-gray-500 px-6 py-2.5 rounded-full transition-all text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2"
              >
                {isConnecting ? 'Authenticating...' : 'Connect Socials'}
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-indigo-500/5 border border-indigo-500/20 px-5 py-2.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">@Creator_Live</span>
              </div>
            )}
            
            {uploadedImage && !isProcessing && (
              <button 
                onClick={reset}
                className="text-[10px] font-black uppercase tracking-widest bg-white text-black px-6 py-2.5 rounded-full hover:bg-indigo-500 hover:text-white transition-all"
              >
                New Studio
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!uploadedImage ? (
          <div className="text-center py-20 space-y-10">
            <div className="space-y-4">
              <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                Professional Creative Suite
              </div>
              <h2 className="text-7xl font-black tracking-tighter leading-[0.9] max-w-4xl mx-auto">
                Turn your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">Character</span> <br/>
                into a global campaign.
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
                Generate 5 high-converting 1K ad creatives using Gemini 3 Pro. Optimized for Reels, TikTok, and direct social publishing.
              </p>
            </div>
            <UploadArea onUpload={handleUpload} isProcessing={isProcessing} />
          </div>
        ) : (
          <div className="space-y-16 animate-scale-in">
            <div className="bg-[#0a0a0a] border border-gray-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
                <div className="w-full md:w-64 shrink-0">
                  <div className="relative aspect-[9/16] rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-3xl shadow-indigo-500/10">
                    <img src={uploadedImage} alt="Reference" className="w-full h-full object-cover" />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                         <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                         <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Deep Analysis...</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 space-y-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-5xl font-black tracking-tighter">Strategic Insight</h3>
                      <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                        PRO {selectedStyle}
                      </div>
                    </div>
                    {isProcessing && (
                      <p className="text-indigo-400/50 text-xs font-medium uppercase tracking-[0.2em]">Utilizing 16k Token Thinking Budget</p>
                    )}
                  </div>
                  
                  {isProcessing ? (
                    <div className="space-y-6 max-w-md">
                      <div className="h-1.5 bg-gray-900 rounded-full w-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-700 ease-in-out" 
                          style={{ width: `${(progressIndex / 5) * 100}%` }}
                        ></div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-white text-xs font-black uppercase tracking-widest">
                          {progressIndex === 0 ? "Analyzing Brand DNA..." : `Crafting Campaign ${progressIndex} of 5...`}
                        </p>
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider">Sequential Pro Generation (Vercel Optimized)</p>
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
                        Renew API Key
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full"></div>
            </div>

            <div className="space-y-12">
              <div className="flex items-center justify-between border-b border-gray-900 pb-8">
                <h3 className="text-4xl font-black tracking-tighter">THE <span className="text-indigo-500">VIN</span> GALLERY</h3>
                {!isProcessing && result && (
                  <button 
                    onClick={handleGenerateMore}
                    disabled={isGeneratingMore}
                    className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-full hover:bg-indigo-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-50"
                  >
                    {isGeneratingMore ? 'Processing...' : 'Add Variation'}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                {isProcessing && !result ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="aspect-[9/20] bg-gray-900/20 rounded-3xl animate-pulse border border-gray-900 flex flex-col p-6 space-y-4">
                       <div className="flex-1 bg-gray-900/50 rounded-2xl"></div>
                       <div className="h-4 bg-gray-900/50 rounded-full w-3/4"></div>
                       <div className="h-4 bg-gray-900/50 rounded-full w-1/2"></div>
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

      <footer className="border-t border-gray-900 py-20 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-8">
          <div className="flex justify-center gap-12 text-[10px] font-black uppercase tracking-[0.4em] text-gray-700">
             <span className="hover:text-white transition-colors cursor-default">PREMIUM</span>
             <span className="hover:text-white transition-colors cursor-default">AUTONOMOUS</span>
             <span className="hover:text-white transition-colors cursor-default">CREATIVE</span>
          </div>
          <div className="space-y-2">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest font-black">&copy; 2024 VIN AI • LONDON • NYC • TOKYO</p>
            <p className="text-gray-800 text-[8px] uppercase tracking-widest">Built with Gemini 3 Pro Technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
