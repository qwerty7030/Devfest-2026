import React, { useState, useEffect, useRef } from 'react';
import { Camera, Timer, Sparkles, RotateCcw, CheckCircle2 } from 'lucide-react';
import { soundEffects } from '../../services/soundEffects';

interface PosingScreenProps {
  onCapturePhoto: () => string | null;
  onFinishPosing: (photos: string[]) => void;
  onCancel: () => void;
}

export const PosingScreen: React.FC<PosingScreenProps> = ({
  onCapturePhoto,
  onFinishPosing,
  onCancel,
}) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [timerCount, setTimerCount] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const timerIntervalRef = useRef<number | null>(null);

  const currentPoseTarget = photos.length === 0 ? 1 : 2;

  const posePrompts = {
    1: {
      title: 'Pose 1 of 2: Full Body Flex',
      cue: 'Step back, hands in pockets or relaxed stance 🧍‍♂️',
    },
    2: {
      title: 'Pose 2 of 2: Angle or Kicks Detail',
      cue: 'Turn 45°, look to the side, or showcase your kicks 👟',
    },
  };

  const triggerSnap = () => {
    // Shutter sound
    soundEffects.playShutter();

    // Visual Flash effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const snapshot = onCapturePhoto();
    if (snapshot) {
      setPhotos((prev) => [...prev, snapshot]);
    }
  };

  // Start 3-second self-timer before snap
  const startTimerSnap = () => {
    if (timerCount !== null) return;
    setTimerCount(3);
    soundEffects.playTick();

    timerIntervalRef.current = window.setInterval(() => {
      setTimerCount((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          triggerSnap();
          return null;
        }
        soundEffects.playTick();
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleRetakePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    if (photos.length > 0) {
      onFinishPosing(photos);
    }
  };

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col justify-between p-4 bg-gradient-to-b from-black/80 via-transparent to-black/90 select-none">
      {/* Flash overlay */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 animate-out fade-out" />
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between z-20">
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 text-pink-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Camera className="w-4 h-4" />
            <span>Outfit Photoshoot</span>
          </div>
          <span className="text-white text-sm font-bold tracking-tight">
            {photos.length < 2
              ? posePrompts[currentPoseTarget as 1 | 2].title
              : 'Photos Ready for Post! ✨'}
          </span>
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-zinc-400 hover:text-white px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10"
        >
          Cancel
        </button>
      </div>

      {/* Middle Posing Guide Banner & Self-Timer Number */}
      <div className="my-auto flex flex-col items-center justify-center z-20 pointer-events-none">
        {timerCount !== null ? (
          <div className="text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(236,72,153,0.9)] animate-ping">
            {timerCount}
          </div>
        ) : (
          photos.length < 2 && (
            <div className="bg-black/60 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide shadow-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <span>{posePrompts[currentPoseTarget as 1 | 2].cue}</span>
            </div>
          )
        )}
      </div>

      {/* Bottom Controls & Gallery Thumbnails */}
      <div className="flex flex-col gap-3 z-20">
        {/* Thumbnails strip */}
        <div className="flex items-center justify-center gap-3">
          {[0, 1].map((idx) => {
            const hasPhoto = photos[idx];
            return (
              <div
                key={idx}
                className={`relative w-16 h-22 rounded-xl overflow-hidden border-2 transition-all ${
                  hasPhoto
                    ? 'border-pink-500 shadow-lg shadow-pink-500/20'
                    : idx === photos.length
                    ? 'border-white/40 border-dashed bg-black/40 flex items-center justify-center text-white/50'
                    : 'border-white/10 bg-black/20 flex items-center justify-center text-white/20'
                }`}
              >
                {hasPhoto ? (
                  <>
                    <img
                      src={hasPhoto}
                      alt={`Pose ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRetakePhoto(idx)}
                      title="Retake photo"
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-black text-white text-[10px]"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/80 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold text-pink-300">
                      #{idx + 1}
                    </div>
                  </>
                ) : (
                  <span className="text-[11px] font-mono font-semibold">
                    Shot {idx + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Shutter Action Bar */}
        {photos.length < 2 ? (
          <div className="flex items-center justify-center gap-4 py-2">
            {/* 3s Self Timer Button */}
            <button
              onClick={startTimerSnap}
              disabled={timerCount !== null}
              className="p-3 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white backdrop-blur-md active:scale-95 transition-all flex items-center justify-center"
              title="3s Timer Snap"
            >
              <Timer className="w-5 h-5 text-amber-400" />
            </button>

            {/* Shutter Button */}
            <button
              onClick={triggerSnap}
              disabled={timerCount !== null}
              aria-label="Capture photo"
              className="w-18 h-18 rounded-full border-4 border-white/90 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 shadow-xl" />
            </button>

            {/* If 1 photo is taken, show option to finish early with 1 photo */}
            {photos.length === 1 && (
              <button
                onClick={handleComplete}
                className="px-3.5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5"
              >
                <span>Use 1 Photo</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}
          </div>
        ) : (
          /* Both Photos Taken: Advance Button */
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleComplete}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 active:scale-98 text-white font-black text-sm sm:text-base tracking-wide transition-all shadow-xl shadow-pink-500/30 flex items-center justify-center gap-2.5"
            >
              <Sparkles className="w-5 h-5" />
              <span>GENERATE INSTAGRAM POST</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
