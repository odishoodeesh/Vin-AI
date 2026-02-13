
import React, { useCallback, useState } from 'react';

interface UploadAreaProps {
  onUpload: (base64: string, style: string) => void;
  isProcessing: boolean;
}

const STYLES = [
  { id: 'Gen Z outfit', icon: '👟', label: 'Gen Z Style' },
  { id: 'Gym', icon: '💪', label: 'Gym Vibe' },
  { id: 'Coffee', icon: '☕', label: 'Coffee Shop' },
  { id: 'Mirror selfie', icon: '🤳', label: 'Mirror Selfie' },
  { id: 'Dress', icon: '👗', label: 'Elegant Dress' },
  { id: 'Hotel room', icon: '🏨', label: 'Hotel Room' },
  { id: 'Sexy', icon: '🔥', label: 'Sultry / Sexy' },
  { id: 'Disposable Cam', icon: '🎞️', label: 'Disposable Cam' },
  { id: 'Street Snap', icon: '🚦', label: 'Street Snap' },
  { id: 'Home Body', icon: '🛋️', label: 'Home Body' },
  { id: 'Golden Hour', icon: '🌇', label: 'Golden Hour' },
  { id: 'Car Seat', icon: '🚗', label: 'Car Seat' },
  { id: 'Random', icon: '🎲', label: 'Random' },
];

export const UploadArea: React.FC<UploadAreaProps> = ({ onUpload, isProcessing }) => {
  const [selectedStyle, setSelectedStyle] = useState('Random');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string, selectedStyle);
      };
      reader.readAsDataURL(file);
    }
  }, [onUpload, selectedStyle]);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Style Selector */}
      <div className="space-y-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Step 1: Choose Your Campaign Style</p>
        <div className="flex flex-wrap justify-center gap-3">
          {STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              disabled={isProcessing}
              className={`px-4 py-3 rounded-xl border transition-all duration-300 flex items-center gap-2 group ${
                selectedStyle === style.id
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-[#111] border-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              <span className="text-lg">{style.icon}</span>
              <span className="text-sm font-semibold">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Dropzone */}
      <div className="space-y-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Step 2: Upload Character Reference</p>
        <label 
          className={`relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all duration-300 ${
            isProcessing 
              ? 'border-gray-700 bg-gray-900/50 cursor-not-allowed' 
              : 'border-indigo-500/30 bg-[#111] hover:bg-indigo-500/5 hover:border-indigo-500/60'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-10 text-center">
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <p className="text-xl font-bold text-white mb-2">Generating Masterpieces</p>
                <p className="text-sm text-gray-500 max-w-xs">Our AI is analyzing your influencer's vibe and rendering unique high-res ads...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-indigo-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                  </svg>
                </div>
                <p className="mb-2 text-2xl font-black text-white">Click to Upload</p>
                <p className="text-sm text-gray-400 mb-4">Your AI influencer character portrait</p>
                <div className="px-4 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                  Style: {selectedStyle}
                </div>
              </>
            )}
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>
      </div>

      <div className="flex justify-center gap-12 text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black opacity-50">
        <span>High Resolution</span>
        <span>9:16 Vertical</span>
        <span>Marketing Copy</span>
      </div>
    </div>
  );
};
