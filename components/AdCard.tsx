
import React, { useState } from 'react';
import { AdCampaign } from '../types';

interface AdCardProps {
  campaign: AdCampaign;
  isReelConnected: boolean;
  onPostSuccess: () => void;
}

export const AdCard: React.FC<AdCardProps> = ({ campaign, isReelConnected, onPostSuccess }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const handleDownload = () => {
    if (!campaign.imageUrl) return;
    const link = document.createElement('a');
    link.href = campaign.imageUrl;
    const safeTitle = campaign.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `VinAd_${campaign.id}_${safeTitle}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePostToReels = () => {
    if (!campaign.imageUrl || isPublishing || isPublished) return;
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setIsPublished(true);
      onPostSuccess();
    }, 2500);
  };

  return (
    <div className="bg-[#121411] border border-brand-olive/10 rounded-[2rem] overflow-hidden hover:border-brand-lime/30 transition-all duration-500 group flex flex-col h-full shadow-2xl relative">
      <div className="relative aspect-[9/16] bg-black overflow-hidden">
        {campaign.imageUrl ? (
          <img 
            src={campaign.imageUrl} 
            alt={campaign.title}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-olive/20 font-black uppercase text-xs tracking-widest">
            Rendering Asset...
          </div>
        )}
        
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <span className="px-3 py-1 bg-black/40 backdrop-blur-xl text-brand-lime text-[9px] font-black rounded-full border border-brand-lime/20 uppercase tracking-[0.2em]">
            {campaign.platform}
          </span>
          <div className="w-8 h-8 rounded-full bg-brand-lime/10 backdrop-blur-xl border border-brand-lime/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse"></div>
          </div>
        </div>

        {isPublishing && (
          <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 border-2 border-brand-lime border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-brand-lime font-black uppercase tracking-[0.2em] text-[10px]">Uploading Stream</p>
          </div>
        )}

        {isPublished && (
          <div className="absolute inset-0 z-20 bg-brand-lime/10 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-brand-lime rounded-full flex items-center justify-center shadow-2xl shadow-brand-lime/20 mb-3 animate-scale-in">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <p className="text-white font-black uppercase tracking-widest text-[10px]">Live on Feed</p>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent pt-24">
          <h3 className="text-xl font-black text-white mb-2 leading-tight uppercase tracking-tighter">
            {campaign.title}
          </h3>
          <p className="text-brand-lime font-bold text-xs mb-3 italic tracking-wide opacity-90">
            "{campaign.hook}"
          </p>
        </div>
      </div>
      
      <div className="p-6 space-y-5 flex-1 flex flex-col">
        {isReelConnected && (
          <button 
            onClick={handlePostToReels}
            disabled={!campaign.imageUrl || isPublishing || isPublished}
            className={`w-full py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all duration-500 ${
              isPublished 
                ? 'bg-brand-olive/20 text-brand-olive border border-brand-olive/30 cursor-default'
                : 'bg-brand-lime text-black hover:bg-white border border-transparent shadow-xl shadow-brand-lime/5 active:scale-95'
            }`}
          >
            {isPublished ? 'Published' : isPublishing ? 'Transmitting...' : 'Post Instantly'}
          </button>
        )}

        <div className="grid grid-cols-2 gap-4 border-b border-brand-olive/10 pb-4">
          <div>
            <h4 className="text-brand-olive font-black text-[8px] uppercase tracking-[0.2em] mb-1 opacity-60">Targeting</h4>
            <p className="text-gray-400 text-[11px] font-bold leading-tight">{campaign.audience}</p>
          </div>
          <div className="text-right">
            <h4 className="text-brand-olive font-black text-[8px] uppercase tracking-[0.2em] mb-1 opacity-60">Vibe</h4>
            <p className="text-gray-400 text-[11px] font-bold leading-tight">{campaign.tone}</p>
          </div>
        </div>

        <div className="flex-1">
          <h4 className="text-brand-olive font-black text-[8px] uppercase tracking-[0.2em] mb-2 opacity-60">Caption Copy</h4>
          <div className="bg-black/40 border border-brand-olive/10 p-4 rounded-2xl text-[11px] text-gray-400 leading-relaxed font-medium italic opacity-80">
            {campaign.caption}
          </div>
        </div>

        <div className="pt-4 mt-auto flex items-center justify-between border-t border-brand-olive/10">
          <button 
            onClick={handleDownload}
            disabled={!campaign.imageUrl}
            className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 ${
              campaign.imageUrl 
                ? 'text-brand-olive hover:text-brand-lime cursor-pointer' 
                : 'text-gray-800 cursor-not-allowed'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Export Asset
          </button>
          <div className="flex gap-1.5 opacity-30">
            <div className="w-1 h-1 rounded-full bg-brand-olive"></div>
            <div className="w-1 h-1 rounded-full bg-brand-olive"></div>
            <div className="w-1 h-1 rounded-full bg-brand-lime"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
