import React from 'react';

interface SilhouetteGuideProps {
  visible: boolean;
}

export const SilhouetteGuide: React.FC<SilhouetteGuideProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between py-12 px-6 z-10">
      {/* Top Banner Guide */}
      <div className="bg-black/60 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide flex items-center gap-2 shadow-xl animate-bounce">
        <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping" />
        <span>Optional guide — partial outfits work too</span>
      </div>

      {/* Human Silhouette Outline */}
      <div className="relative w-64 h-[440px] max-h-[60vh] flex items-center justify-center opacity-40">
        <svg
          viewBox="0 0 200 450"
          className="w-full h-full stroke-white/80 fill-none"
          strokeWidth="2.5"
          strokeDasharray="6 6"
        >
          {/* Head */}
          <circle cx="100" cy="50" r="28" />
          {/* Neck */}
          <path d="M 94 78 L 94 92 M 106 78 L 106 92" />
          {/* Shoulders & Torso */}
          <path d="M 45 110 Q 100 95 155 110 L 145 230 Q 100 240 55 230 Z" />
          {/* Arms */}
          <path d="M 45 110 L 30 220 L 25 250" />
          <path d="M 155 110 L 170 220 L 175 250" />
          {/* Hips & Legs */}
          <path d="M 55 230 L 65 370 L 60 410" />
          <path d="M 145 230 L 135 370 L 140 410" />
          {/* Inseam */}
          <path d="M 100 245 L 95 365" />
          <path d="M 100 245 L 105 365" />
          {/* Shoes */}
          <path d="M 52 415 Q 65 410 80 420" />
          <path d="M 148 415 Q 135 410 120 420" />
        </svg>

        {/* Alignment corner crosshairs */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-pink-500/80" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-pink-500/80" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-pink-500/80" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-pink-500/80" />
      </div>

      {/* Foot alignment baseline */}
      <div className="text-white/60 text-[11px] font-mono tracking-widest uppercase bg-black/40 px-3 py-1 rounded-md backdrop-blur-sm border border-white/10">
        Use any comfortable framing
      </div>
    </div>
  );
};
