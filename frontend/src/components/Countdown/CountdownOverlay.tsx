import React, { useEffect, useState } from 'react';
import { soundEffects } from '../../services/soundEffects';

interface CountdownOverlayProps {
  onComplete: () => void;
  seconds?: number;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  onComplete,
  seconds = 3,
}) => {
  const [count, setCount] = useState<number>(seconds);

  useEffect(() => {
    soundEffects.playTick();

    const interval = window.setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          soundEffects.playGoChime();
          onComplete();
          return 0;
        }
        soundEffects.playTick();
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [onComplete]);

  const cues: Record<number, string> = {
    3: 'Step back to the baseline 🚶',
    2: 'Get into position ✨',
    1: 'Get ready to show the fit! 🔥',
    0: 'LIVE! 🚀',
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center select-none">
      {/* Radial pulse waves */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-48 h-48 rounded-full border-2 border-pink-500/40 animate-ping" />
        <div className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-600/30 blur-xl animate-pulse" />

        {/* Big countdown digit */}
        <div
          key={count}
          className="relative text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-pink-200 to-pink-500 drop-shadow-[0_10px_25px_rgba(236,72,153,0.8)] transform animate-[scale_0.8s_ease-out]"
        >
          {count > 0 ? count : 'GO!'}
        </div>
      </div>

      {/* Cue helper */}
      <div className="mt-8 px-6 py-2 rounded-full bg-black/60 border border-white/20 backdrop-blur-md text-white font-medium text-sm sm:text-base tracking-wide shadow-2xl">
        {cues[count] || 'Strike your pose'}
      </div>
    </div>
  );
};
