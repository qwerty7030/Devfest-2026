import React from 'react';
import { Eye, Volume2, VolumeX, X } from 'lucide-react';

interface LiveHeaderProps {
  viewerCount: number;
  remainingSeconds: number;
  totalDurationSeconds: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onStop: () => void;
}

export const LiveHeader: React.FC<LiveHeaderProps> = ({
  viewerCount,
  remainingSeconds,
  totalDurationSeconds,
  isMuted,
  onToggleMute,
  onStop,
}) => {
  const progressPercent = ((totalDurationSeconds - remainingSeconds) / totalDurationSeconds) * 100;

  // Format viewer count with "k" for numbers over 1000
  const formattedViewers =
    viewerCount >= 1000
      ? (viewerCount / 1000).toFixed(1) + 'k'
      : viewerCount.toString();

  return (
    <div className="absolute top-0 left-0 right-0 z-20 pt-4 pb-3 px-4 flex flex-col gap-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
      {/* Top Bar with Live Tag, Viewers, Timer and Controls */}
      <div className="flex items-center justify-between">
        {/* Left: LIVE pill & Viewers */}
        <div className="flex items-center gap-2">
          {/* Pulsing LIVE badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] tracking-wider uppercase shadow-lg shadow-pink-600/30">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>LIVE</span>
          </div>

          {/* Viewer count pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-md text-white/90 text-xs font-semibold border border-white/10">
            <Eye className="w-3.5 h-3.5 text-zinc-300" />
            <span>{formattedViewers}</span>
          </div>
        </div>

        {/* Right: Timer pill, Sound, and Cancel */}
        <div className="flex items-center gap-2">
          {/* Remaining Seconds Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{remainingSeconds}s</span>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={onToggleMute}
            aria-label="Toggle sound"
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-pink-400" />}
          </button>

          {/* Close/Stop Fit Check */}
          <button
            onClick={onStop}
            aria-label="Cancel live stream"
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mt-1">
        <div
          className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 transition-all duration-300 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
