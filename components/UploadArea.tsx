import React, { useState, useRef, useCallback } from 'react';

interface UploadAreaProps {
  onUpload: (charBase64: string, styleBase64: string | null, style: string) => void;
  isProcessing: boolean;
}

const STYLES = [
  { id: 'Golden Hour', icon: '🌇', label: 'Golden Hour' },
  { id: 'Street Snap', icon: '🚦', label: 'Street Snap' },
  { id: 'Vogue Studio', icon: '👠', label: 'Vogue Studio' },
  { id: 'Old Money', icon: '🐎', label: 'Old Money' },
  { id: 'Polaroid', icon: '📸', label: 'Polaroid' },
  { id: 'Home Body', icon: '🛋️', label: 'Home Body' },
  { id: 'Quiet Luxury', icon: '🥂', label: 'Quiet Luxury' },
  { id: 'Cyberpunk', icon: '🏙️', label: 'Cyberpunk' },
  { id: 'Gorpcore', icon: '🏔️', label: 'Gorpcore' },
  { id: 'Fisheye Lens', icon: '👁️', label: 'Fisheye' },
  { id: 'Random', icon: '🎲', label: 'Random' },
];

export const UploadArea: React.FC<UploadAreaProps> = ({ onUpload, isProcessing }) => {
  const [selectedStyle, setSelectedStyle] = useState('Random');
  const [charImage, setCharImage] = useState<string | null>(null);
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', aspectRatio: 9/16 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCharImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleStart = () => {
    if (charImage) {
      onUpload(charImage, styleImage, selectedStyle);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16 animate-scale-in">
      <div className="space-y-8">
        <p className="text-[11px] font-black text-brand-lime uppercase tracking-[0.6em] text-center opacity-60">Phase 01: Aesthetic Selection</p>
        <div className="flex flex-wrap justify-center gap-3 p-6 bg-white/[0.02] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden relative">
          {STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-2xl border transition-all duration-500 flex items-center gap-3 active:scale-95 ${
                selectedStyle === style.id
                  ? 'bg-brand-lime border-brand-lime text-black shadow-xl shadow-brand-lime/20 font-black'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:border-brand-lime/30 hover:text-white'
              }`}
            >
              <span className="text-lg">{style.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{style.label}</span>
            </button>
          ))}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-lime/20 to-transparent"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Character Identity */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h4 className="text-[10px] font-black text-brand-lime uppercase tracking-[0.4em]">Influencer ID</h4>
            <button 
              onClick={isCameraActive ? capturePhoto : startCamera}
              disabled={isProcessing}
              className="text-[9px] font-black uppercase tracking-widest text-brand-lime border border-brand-lime/30 px-4 py-1.5 rounded-full hover:bg-brand-lime hover:text-black transition-all"
            >
              {isCameraActive ? 'Capture' : 'Live Cam'}
            </button>
          </div>
          
          <div className={`relative aspect-[9/16] rounded-[3.5rem] overflow-hidden border-2 border-dashed transition-all duration-700 ${
            charImage ? 'border-brand-lime/30' : 'border-white/5 bg-white/[0.02] hover:border-brand-lime/20'
          }`}>
            {isCameraActive ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : charImage ? (
              <img src={charImage} className="absolute inset-0 w-full h-full object-cover" alt="Subject" />
            ) : (
              <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-12 text-center group">
                <div className="w-16 h-16 bg-brand-lime/10 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-brand-lime/20">
                  <svg className="w-8 h-8 text-brand-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-white mb-2">Upload Portrait</span>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest leading-relaxed">Identity reference for AI Consistency</p>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFile(e, 'char')} disabled={isProcessing} />
              </label>
            )}
            
            {(charImage || isCameraActive) && !isProcessing && (
              <button 
                onClick={() => { setCharImage(null); isCameraActive && stopCamera(); }}
                className="absolute top-6 right-6 w-10 h-10 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-red-500/80 transition-all z-10"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Style Reference */}
        <div className="space-y-6">
          <h4 className="px-4 text-[10px] font-black text-brand-sage uppercase tracking-[0.4em]">Creative Direction</h4>
          <div className={`relative aspect-[9/16] rounded-[3.5rem] overflow-hidden border-2 border-dashed transition-all duration-700 ${
            styleImage ? 'border-brand-sage/30' : 'border-white/5 bg-white/[0.02] hover:border-brand-sage/20'
          }`}>
            {styleImage ? (
              <img src={styleImage} className="absolute inset-0 w-full h-full object-cover" alt="Style" />
            ) : (
              <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-12 text-center group">
                <div className="w-16 h-16 bg-brand-sage/10 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-brand-sage/20">
                  <svg className="w-8 h-8 text-brand-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-white mb-2">Context Reference</span>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest leading-relaxed">Optional: Vibe, Place, or Outfit</p>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFile(e, 'style')} disabled={isProcessing} />
              </label>
            )}
            
            {styleImage && !isProcessing && (
              <button 
                onClick={() => setStyleImage(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-red-500/80 transition-all z-10"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center pt-12">
        <button 
          onClick={handleStart}
          disabled={!charImage || isProcessing}
          className={`group relative px-16 py-6 rounded-[3rem] font-black text-xs uppercase tracking-[0.5em] transition-all duration-700 overflow-hidden shadow-2xl ${
            charImage && !isProcessing 
              ? 'bg-brand-lime text-black hover:scale-105 shadow-brand-lime/20' 
              : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 border-[3px] border-black/20 border-t-black rounded-full animate-spin"></div>
              <span>Neural Pipeline Active</span>
            </div>
          ) : (
            <span>Execute Campaign</span>
          )}
          {charImage && !isProcessing && (
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700 pointer-events-none"></div>
          )}
        </button>
        {!charImage && !isProcessing && (
          <p className="mt-8 text-[9px] font-black text-brand-lime/40 uppercase tracking-[0.4em] animate-pulse">Awaiting Identity Upload</p>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};