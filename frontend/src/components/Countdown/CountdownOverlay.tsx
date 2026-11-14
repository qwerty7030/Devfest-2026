import { useEffect, useState } from 'react';
import { soundEffects } from '../../services/soundEffects';

export function CountdownOverlay({ onComplete, seconds = 3 }: { onComplete: () => void; seconds?: number }) {
  const [count, setCount] = useState(seconds);
  useEffect(() => {
    if (count <= 0) { soundEffects.playGoChime(); onComplete(); return; }
    soundEffects.playTick();
    const timer = setTimeout(() => setCount(n => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);
  return <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center" role="status">
    <span className="text-xs tracking-[.3em] uppercase text-pink-200">Your moment starts in</span>
    <span className="text-[150px] leading-tight font-black text-white">{count || 'GO'}</span>
    <span className="rounded-full border border-white/20 bg-black/40 px-5 py-3 text-sm">Step back. Find your light. Own it.</span>
  </div>;
}
