import React from 'react';
import { UserCheck, RotateCw, Footprints, Camera } from 'lucide-react';

interface CoachingCueProps {
  elapsedSeconds: number;
  totalDurationSeconds: number;
}

export const CoachingCue: React.FC<CoachingCueProps> = ({ elapsedSeconds }) => {
  let text = 'Show any part of your outfit';
  let icon = <UserCheck className="w-4 h-4 text-pink-400" />;
  let phaseName = 'YOUR FIT';

  if (elapsedSeconds < 4) {
    phaseName = 'STAGE 1 / 4';
    text = 'Show your fit — any framing works';
    icon = <UserCheck className="w-4 h-4 text-pink-400" />;
  } else if (elapsedSeconds < 8) {
    phaseName = 'STAGE 2 / 4';
    text = 'Try another angle if you like';
    icon = <RotateCw className="w-4 h-4 text-purple-400 animate-spin" />;
  } else if (elapsedSeconds < 12) {
    phaseName = 'STAGE 3 / 4';
    text = 'Highlight details, shoes & jewelry 👟';
    icon = <Footprints className="w-4 h-4 text-amber-400" />;
  } else {
    phaseName = 'STAGE 4 / 4';
    text = 'Hold your final pose! 📸';
    icon = <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />;
  }

  return (
    <div className="absolute top-28 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
      <div className="bg-black/60 backdrop-blur-md border border-white/20 text-white px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2.5 transition-all duration-300">
        <div className="p-1 rounded-full bg-white/10 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-mono font-bold leading-none">
            {phaseName}
          </span>
          <span className="text-xs sm:text-sm font-semibold tracking-wide">
            {text}
          </span>
        </div>
      </div>
    </div>
  );
};
