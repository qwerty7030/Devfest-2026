import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { startPhotoSequence } from '../../services/photoSequence';
import { soundEffects } from '../../services/soundEffects';
export function PosingScreen(props: { onCapturePhoto: () => string | null; onFinishPosing: (photos: string[]) => void; onCancel: () => void }) {
  const callbacks = useRef(props); callbacks.current = props;
  const [pose, setPose] = useState(0), [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let flashTimer: ReturnType<typeof setTimeout>;
    const stop = startPhotoSequence({
      capture: () => callbacks.current.onCapturePhoto(), onPose: setPose,
      onTick: n => { setCount(n); if (n) soundEffects.playTick(); },
      onPhoto: () => { soundEffects.playShutter(); setFlash(true); flashTimer = setTimeout(() => setFlash(false), 160); },
      onComplete: photos => callbacks.current.onFinishPosing(photos), onError: () => setError(true),
    });
    return () => { stop(); clearTimeout(flashTimer); };
  }, [attempt]);
  return <div className="auto-photos">
    <button className="icon-button pose-cancel" onClick={props.onCancel} aria-label="Cancel photos"><X size={18}/></button>
    <div className="pose-instruction" role="status"><small>Photo {pose + 1} / 3</small><h2>{['Hold your pose', 'Try another angle', 'One last look'][pose]}</h2><p>{error ? 'Camera not ready.' : 'Your photo is taken automatically.'}</p></div>
    {count && <div className="pose-count" aria-live="polite">{count}</div>}
    {error && <button className="primary-action pose-retry" onClick={() => { setError(false); setAttempt(v => v + 1); }}>Restart countdown</button>}
    {flash && <div className="photo-flash"/>}
  </div>;
}
