
import React, { useCallback, useState } from 'react';

interface UploadAreaProps {
  onUpload: (charBase64: string, styleBase64: string | null, style: string) => void;
  isProcessing: boolean;
}

const STYLES = [
  { id: 'Disposable Cam', icon: '🎞️', label: 'Disposable Cam' },
  { id: 'Street Snap', icon: '🚦', label: 'Street Snap' },
  { id: 'Home Body', icon: '🛋️', label: 'Home Body' },
  { id: 'Golden Hour', icon: '🌇', label: 'Golden Hour' },
  { id: 'Car Seat', icon: '🚗', label: 'Car Seat' },
  { id: 'Polaroid', icon: '📸', label: 'Polaroid' },
  { id: 'Fisheye Lens', icon: '👁️', label: 'Fisheye' },
  { id: 'Old Money', icon: '🐎', label: 'Old Money' },
  { id: 'Quiet Luxury', icon: '🥂', label: 'Quiet Luxury' },
  { id: 'Vogue Studio', icon: '👠', label: 'Vogue Studio' },
  { id: 'Yacht Life', icon: '🛥️', label: 'Yacht Life' },
  { id: 'Cyberpunk', icon: '🏙️', label: 'Cyberpunk' },
  { id: 'Dark Academia', icon: '📖', label: 'Dark Academia' },
  { id: 'Cottagecore', icon: '🧺', label: 'Cottagecore' },
  { id: 'Gorpcore', icon: '🏔️', label: 'Gorpcore' },
  { id: 'Gen Z outfit', icon: '👟', label: 'Gen Z Style' },
  { id: 'Mirror selfie', icon: '🤳', label: 'Mirror Selfie' },
  { id: 'Random', icon: '🎲', label: 'Random' },
];

export const UploadArea: React.FC<UploadAreaProps> = ({ onUpload, isProcessing }) => {
  const [selectedStyle, setSelectedStyle] = useState('Random');
  const [charImage, setCharImage] = useState<string | null>(null);
  const [styleImage, setStyleImage] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'char' | 'style') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'char') setCharImage(base64);
        else setStyleImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStart = () => {
    if (charImage) {
      onUpload(charImage, styleImage, selectedStyle);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="space-y-6">
        <p className="text-[10px] font-black text-brand-olive uppercase tracking-[0.4em] text-center">Step 1: Define Your Aesthetic</p>
        <div className="flex flex-wrap justify-center gap-2 max-h-[160px] overflow-y-auto p-4 bg-black/20 rounded-[2rem] border border-brand-olive/5 custom-scrollbar">
          {STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              disabled={isProcessing}
              className={`px-4 py-2.5 rounded-xl border transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                selectedStyle === style.id
                  ? 'bg-brand-lime border-brand-lime text-black shadow-lg shadow-brand-lime/10 font-black'
                  : 'bg-[#0a0b0a] border-brand-olive/10 text-gray-500 hover:border-brand-olive/40 hover:text-gray-300'
              }`}
            >
              <span className="text-sm">{style.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <p className="text-[10px] font-black text-brand-olive uppercase tracking-[0.4em] text-center">Step 2: Upload References</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Character Upload */}
          <div className="space-y-4">
            <h4 className="text-center text-[9px] font-black text-brand-lime uppercase tracking-widest">Character Identity (Who)</h4>
            <label 
              className={`relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-[3rem] cursor-pointer transition-all duration-700 group overflow-hidden ${
                isProcessing 
                  ? 'border-brand-olive/10 bg-black/40 cursor-not-allowed' 
                  : 'border-brand-lime/10 bg-[#0a0b0a] hover:border-brand-lime/40'
              }`}
            >
              {charImage ? (
                <img src={charImage} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" alt="Character" />
              ) : null}
              <div className="relative z-10 flex flex-col items-center p-6 text-center">
                {!charImage && (
                  <div className="w-12 h-12 bg-brand-lime/10 rounded-2xl flex items-center justify-center mb-4 border border-brand-lime/20">
                    <svg className="w-6 h-6 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                )}
                <span className="text-xs font-black text-white uppercase tracking-widest">{charImage ? 'Change Character' : 'Upload Influencer'}</span>
                {!charImage && <p className="text-[8px] text-brand-olive mt-2 uppercase tracking-widest font-black">Portrait recommended</p>}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFile(e, 'char')} disabled={isProcessing} />
            </label>
          </div>

          {/* Style Upload */}
          <div className="space-y-4">
            <h4 className="text-center text-[9px] font-black text-brand-sage uppercase tracking-widest">Style Reference (Vibe/Outfit/Place)</h4>
            <label 
              className={`relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-[3rem] cursor-pointer transition-all duration-700 group overflow-hidden ${
                isProcessing 
                  ? 'border-brand-olive/10 bg-black/40 cursor-not-allowed' 
                  : 'border-brand-sage/10 bg-[#0a0b0a] hover:border-brand-sage/40'
              }`}
            >
              {styleImage ? (
                <img src={styleImage} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" alt="Style" />
              ) : null}
              <div className="relative z-10 flex flex-col items-center p-6 text-center">
                {!styleImage && (
                  <div className="w-12 h-12 bg-brand-sage/10 rounded-2xl flex items-center justify-center mb-4 border border-brand-sage/20">
                    <svg className="w-6 h-6 text-brand-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                <span className="text-xs font-black text-white uppercase tracking-widest">{styleImage ? 'Change Style Reference' : 'Copy Style/Place/Outfit'}</span>
                {!styleImage && <p className="text-[8px] text-brand-olive mt-2 uppercase tracking-widest font-black">Optional: Copy from photo</p>}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFile(e, 'style')} disabled={isProcessing} />
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center pt-8">
        <button 
          onClick={handleStart}
          disabled={!charImage || isProcessing}
          className={`group relative px-12 py-5 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.4em] transition-all duration-500 overflow-hidden ${
            charImage && !isProcessing 
              ? 'bg-brand-lime text-black hover:scale-105 shadow-2xl shadow-brand-lime/20' 
              : 'bg-brand-olive/20 text-brand-olive cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
              <span>Neural Rendering...</span>
            </div>
          ) : (
            <span>Initialize Studio</span>
          )}
        </button>
        {!charImage && !isProcessing && (
          <p className="mt-4 text-[8px] font-black text-brand-olive uppercase tracking-[0.3em] animate-pulse">Waiting for character identity</p>
        )}
      </div>

      <div className="flex justify-center gap-16 text-[8px] text-brand-olive uppercase tracking-[0.5em] font-black opacity-20">
        <span>Dual Reference Sync</span>
        <span>8K Native</span>
        <span>Style Transfer</span>
      </div>
    </div>
  );
};
