import React, { useState } from 'react';
import { Maximize2, Minimize2, Sparkles } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  const [isFullBleed, setIsFullBleed] = useState<boolean>(false);

  return (
    <div className="relative w-screen h-screen min-h-screen bg-zinc-950 overflow-hidden flex flex-col items-center justify-center">
      {/* Background Ambient Glow for Desktop */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-pink-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Desktop Top Branding Banner (hidden on mobile) */}
      {!isFullBleed && (
        <header className="hidden lg:flex items-center justify-between w-full max-w-4xl px-6 py-3 text-zinc-400 text-xs z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
            <span className="font-bold text-white text-sm tracking-wide">FIT CHECK</span>
            <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[10px] px-2 py-0.5 rounded-full font-mono font-medium">
              DevFest 2026
            </span>
          </div>

          <div className="flex items-center gap-3 text-zinc-400 text-xs">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Camera-First Live Audience Reaction</span>
            </span>
            <button
              onClick={() => setIsFullBleed(true)}
              className="flex items-center gap-1 text-zinc-300 hover:text-white px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Expand</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Container: Mobile Full-screen or Desktop Phone Bezel */}
      <div
        className={`relative transition-all duration-300 overflow-hidden flex flex-col ${
          isFullBleed
            ? 'w-full h-full max-w-none rounded-none border-none'
            : 'w-full h-full sm:max-w-[430px] sm:h-[890px] sm:max-h-[96vh] sm:rounded-[44px] sm:border-[5px] sm:border-zinc-800 sm:shadow-[0_0_70px_rgba(236,72,153,0.18)] sm:ring-1 sm:ring-white/10'
        }`}
      >
        {/* Dynamic Island / Camera Notch on Desktop */}
        {!isFullBleed && (
          <div className="hidden sm:flex absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 items-center justify-center pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 mr-3" />
            <div className="w-2 h-2 rounded-full bg-zinc-800/80" />
          </div>
        )}

        {/* Exit Full-bleed button if expanded */}
        {isFullBleed && (
          <button
            onClick={() => setIsFullBleed(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all shadow-lg"
            title="Exit full window mode"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        )}

        {/* Phone Screen Canvas Content */}
        <div className="relative w-full h-full flex-1 overflow-hidden bg-black flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
};
