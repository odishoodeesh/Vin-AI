
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
    checkKeyStatus();
  }, []);

  const checkKeyStatus = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const status = await window.aistudio.hasSelectedApiKey();
      setHasKey(status);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success as per instructions
      setHasKey(true);
      showNotification("Quota settings updated.", 'success');
    }
  };

  const handleUpload = useCallback(async (base64: string, style: string) => {
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
        setError("API Key configuration error. Please re-select your key.");
      } else if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        setError("Quota exceeded. Please select a billing-enabled API key for reliable generation.");
      } else {
        setError("Failed to generate campaigns. Ensure your image is clear and try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

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
      showNotification(`Generated ad #${nextId} successfully!`, 'success');
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || JSON.stringify(err);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        showNotification("Quota limit reached. Try again in a few seconds or use a paid key.", 'error');
      } else {
        showNotification("Failed to generate another ad.", 'error');
      }
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleConnectReel = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsReelConnected(true);
      setIsConnecting(false);
      showNotification("Reel Account @AI_Creator connected successfully!", 'success');
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

  return (
    <div className="min-h-screen gradient-bg selection:bg-indigo-500/30 relative">
      {notification && (
        <div className={`fixed top-20 right-4 z-[100] px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-bounce flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-bold tracking-tight">{notification.message}</span>
        </div>
      )}

      <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">V</div>
            <h1 className="text-lg font-bold tracking-tight text-white">Vin <span className="text-indigo-500">AI</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            {!hasKey && (
              <button 
                onClick={handleSelectKey}
                className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all"
              >
                Set Paid Quota (Highly Recommended)
              </button>
            )}
            {!isReelConnected ? (
              <button 
                onClick={handleConnectReel}
                disabled={isConnecting}
                className="group relative flex items-center gap-2 bg-black border border-gray-700 hover:border-white px-4 py-2 rounded-full transition-all duration-300"
              >
                {isConnecting ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                )}
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {isConnecting ? 'Authorizing...' : 'Connect Reel Account'}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">@AI_Influencer Connected</span>
              </div>
            )}
            
            {uploadedImage && !isProcessing && (
              <button 
                onClick={reset}
                className="text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest bg-gray-900 px-4 py-2 rounded-full border border-gray-800"
              >
                New Campaign
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!uploadedImage ? (
          <div className="text-center py-20">
            <div className="inline-block mb-6 px-4 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
              Vin AI Influencer Engine
            </div>
            <h2 className="text-6xl font-black mb-6 tracking-tighter leading-none">
              Generate 5 <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">Professional Ads</span>
            </h2>
            <p className="text-gray-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
              Transform your character into a high-converting ad campaign. Connect your Reels account, select a style, and post directly with Vin AI.
            </p>
            {!hasKey && (
              <div className="mb-10 max-w-lg mx-auto p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl">
                <p className="text-amber-500/80 text-sm font-medium mb-4">
                  Free tier accounts often face 429 Resource Exhausted errors. Select a billing-enabled key for uninterrupted generation.
                </p>
                <button 
                  onClick={handleSelectKey}
                  className="bg-amber-500 text-black px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-105 transition-all"
                >
                  Configure Billing/API Key
                </button>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block mt-3 text-[10px] text-amber-500/50 hover:text-amber-500 underline uppercase tracking-widest"
                >
                  Learn about billing
                </a>
              </div>
            )}
            <UploadArea onUpload={handleUpload} isProcessing={isProcessing} />
          </div>
        ) : (
          <div className="space-y-16">
            <div className="bg-[#0f0f0f] border border-gray-800 p-8 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
              <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
                <div className="w-full md:w-64 shrink-0">
                  <div className="relative aspect-[9/16] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-indigo-500/10">
                    <img 
                      src={uploadedImage} 
                      alt="Reference Character" 
                      className="w-full h-full object-cover"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
                         <div className="w-10 h-10 border-2 border-white/20 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
                         <p className="text-[10px] font-black text-white uppercase tracking-widest">Analyzing</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-4xl font-black text-white tracking-tight">Identity Analysis</h3>
                    <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                      Style: {selectedStyle}
                    </div>
                  </div>
                  
                  {isProcessing ? (
                    <div className="space-y-4 max-w-md">
                      <div className="h-2 bg-gray-800 rounded-full w-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-500 ease-out" 
                          style={{ width: `${(progressIndex / 6) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                        {progressIndex === 0 ? "Strategizing Ad Concepts..." : `Rendering Ad ${progressIndex} of 5...`}
                      </p>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Sequential generation with quota protection...</p>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xl leading-relaxed font-medium">
                      {result?.influencerAnalysis}
                    </p>
                  )}
                  
                  {error && (
                    <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-3xl space-y-3">
                      <p className="text-red-400 text-sm font-bold flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        Generation Issue
                      </p>
                      <p className="text-red-400/80 text-xs leading-relaxed">{error}</p>
                      {error.includes("Quota") && (
                        <button 
                          onClick={handleSelectKey}
                          className="text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 px-4 py-2 rounded-full border border-red-500/30 hover:bg-red-500/30 transition-all"
                        >
                          Select New API Key
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full"></div>
            </div>

            <div className="space-y-10">
              <div className="flex items-center justify-between border-b border-gray-800 pb-6">
                <h3 className="text-3xl font-black flex items-center gap-4 text-white">
                  <span className="text-indigo-500">VIN</span> AD GALLERY
                </h3>
                <div className="hidden sm:flex items-center gap-6">
                   {!isProcessing && result && (
                     <button 
                       onClick={handleGenerateMore}
                       disabled={isGeneratingMore}
                       className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 px-6 py-2.5 rounded-full transition-all text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95"
                     >
                       {isGeneratingMore ? (
                         <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                       ) : (
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                         </svg>
                       )}
                       Generate More
                     </button>
                   )}
                   <div className="flex gap-2">
                     <span className="w-3 h-3 rounded-full bg-gray-800"></span>
                     <span className="w-3 h-3 rounded-full bg-gray-800"></span>
                     <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                   </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {isProcessing && !result ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="aspect-[9/22] bg-gray-900/50 rounded-2xl animate-pulse border border-gray-800 flex items-center justify-center p-8">
                       <div className="w-full h-full bg-gray-800/30 rounded-xl"></div>
                    </div>
                  ))
                ) : (
                  <>
                    {result?.campaigns.map((campaign) => (
                      <AdCard 
                        key={campaign.id} 
                        campaign={campaign} 
                        isReelConnected={isReelConnected}
                        onPostSuccess={() => showNotification(`Ad #${campaign.id} published to Reels!`, 'success')}
                      />
                    ))}
                    {isGeneratingMore && (
                      <div className="aspect-[9/22] bg-gray-900/50 rounded-2xl animate-pulse border border-indigo-500/30 flex flex-col items-center justify-center p-8">
                         <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                         <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">Rendering New Creative</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Bottom Generate Now Button */}
              {!isProcessing && result && (
                <div className="flex flex-col items-center pt-12 pb-20 border-t border-gray-800/50">
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-6">Want more variations?</p>
                  <button 
                    onClick={handleGenerateMore}
                    disabled={isGeneratingMore}
                    className="group relative flex items-center gap-4 bg-white text-black hover:bg-indigo-600 hover:text-white disabled:bg-gray-900 disabled:text-gray-600 px-10 py-5 rounded-[2rem] transition-all duration-500 font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-white/5 active:scale-95 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <span className="relative z-10 flex items-center gap-3">
                      {isGeneratingMore ? (
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                      ) : (
                        <div className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path>
                          </svg>
                        </div>
                      )}
                      {isGeneratingMore ? 'Creating Magic...' : 'Generate Now'}
                    </span>
                  </button>
                  <p className="mt-4 text-[9px] text-gray-600 font-medium uppercase tracking-widest">Creates 1 additional custom ad creative</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 py-16 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-8 mb-8 opacity-50 grayscale hover:grayscale-0 transition-all">
             <span className="text-xs font-bold tracking-widest text-white">INSTAGRAM</span>
             <span className="text-xs font-bold tracking-widest text-white">REELS</span>
             <span className="text-xs font-bold tracking-widest text-white">YOUTUBE</span>
          </div>
          <p className="text-gray-500 text-xs mb-2">Developed with Vin AI & Gemini Technology</p>
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.2em] font-black">&copy; 2024 VIN AI CREATIVE AGENCY</p>
        </div>
      </footer>
    </div>
  );
}

export default App;