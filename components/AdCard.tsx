
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
    link.download = `Ad_${campaign.id}_${safeTitle}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePostToReels = () => {
    if (!campaign.imageUrl || isPublishing || isPublished) return;
    
    setIsPublishing(true);
    // Simulate API upload to Reels
    setTimeout(() => {
      setIsPublishing(false);
      setIsPublished(true);
      onPostSuccess();
    }, 2500);
  };

  return (
    <div className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all duration-500 group flex flex-col h-full shadow-2xl relative">
      {/* 9:16 Image Container */}
      <div className="relative aspect-[9/16] bg-gray-900 overflow-hidden">
        {campaign.imageUrl ? (
          <img 
            src={campaign.imageUrl} 
            alt={campaign.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">
            No Image Generated
          </div>
        )}
        
        {/* Ad Platform Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-full border border-white/20 uppercase tracking-widest">
            {campaign.platform}
          </span>
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
          </div>
        </div>

        {/* Publishing Overlay */}
        {isPublishing && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white font-black uppercase tracking-widest text-xs">Publishing to Reels</p>
            <p className="text-gray-500 text-[10px] mt-2 italic leading-relaxed">Uploading creative & syncing caption...</p>
          </div>
        )}

        {/* Success Overlay */}
        {isPublished && (
          <div className="absolute inset-0 z-20 bg-green-500/20 backdrop-blur-[2px] flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 mb-3 animate-scale-in">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <p className="text-white font-black uppercase tracking-widest text-xs drop-shadow-md">Posted to Reels</p>
          </div>
        )}

        {/* Caption Overlay - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent pt-20">
          <h3 className="text-xl font-black text-white mb-2 leading-tight uppercase tracking-tight">
            {campaign.title}
          </h3>
          <p className="text-indigo-300 font-bold text-sm mb-3 italic">
            "{campaign.hook}"
          </p>
        </div>
      </div>
      
      {/* Strategy Content */}
      <div className="p-6 space-y-4 flex-1 flex flex-col">
        {isReelConnected && (
          <button 
            onClick={handlePostToReels}
            disabled={!campaign.imageUrl || isPublishing || isPublished}
            className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all duration-300 ${
              isPublished 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                : 'bg-white text-black hover:bg-indigo-500 hover:text-white border border-transparent shadow-lg shadow-white/5 active:scale-95'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            {isPublished ? 'Live on Reels' : isPublishing ? 'Uploading...' : 'Post to Reels'}
          </button>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-gray-500 font-bold text-[9px] uppercase tracking-widest mb-1">Audience</h4>
            <p className="text-gray-300 text-xs font-medium">{campaign.audience}</p>
          </div>
          <div className="text-right">
            <h4 className="text-gray-500 font-bold text-[9px] uppercase tracking-widest mb-1">Tone</h4>
            <p className="text-gray-300 text-xs font-medium">{campaign.tone}</p>
          </div>
        </div>

        <div className="flex-1">
          <h4 className="text-gray-500 font-bold text-[9px] uppercase tracking-widest mb-1 flex justify-between items-center">
            <span>Caption</span>
            {isReelConnected && <span className="text-indigo-500/50 text-[7px]">Synced to post</span>}
          </h4>
          <div className="bg-black/50 border border-gray-800 p-3 rounded-lg text-xs text-gray-400 leading-relaxed italic">
            {campaign.caption}
          </div>
        </div>

        <div className="pt-4 mt-auto flex items-center justify-between border-t border-gray-800">
          <button 
            onClick={handleDownload}
            disabled={!campaign.imageUrl}
            className={`text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
              campaign.imageUrl 
                ? 'text-indigo-400 hover:text-indigo-300 cursor-pointer' 
                : 'text-gray-700 cursor-not-allowed'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Save File
          </button>
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-gray-700"></div>
            <div className="w-1 h-1 rounded-full bg-gray-700"></div>
            <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
