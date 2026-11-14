import React, { useEffect, useState } from 'react';
import { Sparkles, Scan, Bot } from 'lucide-react';

interface ScannerOverlayProps {
  snapshotUrl?: string;
  isDemo?: boolean;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({ snapshotUrl, isDemo }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    { title: 'Gemini Vision Segmenting Garments', detail: 'Isolating outerwear, silhouette & drape' },
    { title: 'Analyzing Proportion & Palette', detail: 'Evaluating color harmony and shoe break' },
    { title: 'Putting Your Style Report Together', detail: 'A personal perspective on your outfit' },
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setStepIndex(1), 700);
    const timer2 = setTimeout(() => setStepIndex(2), 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex flex-col justify-between p-6 select-none">
      {/* Background snapshot if available */}
      {snapshotUrl && (
        <div className="absolute inset-0 opacity-40 overflow-hidden pointer-events-none">
          <img src={snapshotUrl} alt="Snapshot" className="w-full h-full object-cover scale-105 filter grayscale contrast-125" />
        </div>
      )}

      {/* Laser Scanning Line */}
      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_20px_#ec4899] animate-scan-line z-10 pointer-events-none" />

      {/* Top AI Indicator */}
      <div className="relative z-20 flex justify-center">
        <div className="bg-black/70 backdrop-blur-md border border-pink-500/40 px-4 py-1.5 rounded-full flex items-center gap-2 text-pink-300 text-xs font-mono font-medium shadow-lg animate-pulse">
          <Bot className="w-4 h-4 text-pink-400" />
          <span>{isDemo ? 'PREPARING SAMPLE STYLE REPORT' : 'YOUR PERSONAL STYLE REVIEW'}</span>
        </div>
      </div>

      {/* Center Scanning Bounding Target */}
      <div className="relative z-20 flex flex-col items-center justify-center my-auto">
        <div className="w-56 h-72 border-2 border-dashed border-pink-400/40 rounded-2xl relative flex items-center justify-center">
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-pink-500" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-pink-500" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-pink-500" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-pink-500" />

          {/* Center Scan Reticle */}
          <div className="w-16 h-16 rounded-full border border-pink-500/30 flex items-center justify-center">
            <Scan className="w-8 h-8 text-pink-400 animate-spin" />
          </div>

          {/* Real-time floating detection pills */}
          <div className="absolute -top-3 left-4 bg-zinc-900/90 text-white text-[10px] font-mono px-2 py-0.5 rounded border border-pink-500/50 shadow">
            SILHOUETTE
          </div>
          <div className="absolute top-1/2 -right-3 bg-zinc-900/90 text-white text-[10px] font-mono px-2 py-0.5 rounded border border-purple-500/50 shadow">
            COLOR PALETTE
          </div>
          <div className="absolute -bottom-3 left-6 bg-zinc-900/90 text-white text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/50 shadow">
            OUTFIT DETAILS
          </div>
        </div>
      </div>

      {/* Bottom Progress Status Card */}
      <div className="relative z-20 bg-zinc-900/90 backdrop-blur-xl border border-white/15 p-4 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-xs sm:text-sm font-bold tracking-tight">
              {steps[stepIndex].title}
            </span>
            <span className="text-zinc-400 text-[11px]">
              {steps[stepIndex].detail}
            </span>
          </div>
        </div>

        {/* Multi-step progress dots */}
        <div className="flex items-center gap-1.5 mt-3">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                idx <= stepIndex ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
