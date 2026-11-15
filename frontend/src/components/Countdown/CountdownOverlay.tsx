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
    <span className="text-sm text-white/80">Get ready</span>
    <span className="text-[100px] leading-tight font-normal text-white">{count || 'Go'}</span>
  </div>;
}
