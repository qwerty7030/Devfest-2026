import React from 'react';
import type { GarmentItem } from '../../types/fitCheck';
import { Shirt, Footprints, Layers, Sparkles } from 'lucide-react';

interface GarmentBadgeProps {
  garment: GarmentItem;
}

export const GarmentBadge: React.FC<GarmentBadgeProps> = ({ garment }) => {
  const getIcon = () => {
    switch (garment.category) {
      case 'Outerwear':
        return <Layers className="w-4 h-4 text-pink-400" />;
      case 'Footwear':
        return <Footprints className="w-4 h-4 text-amber-400" />;
      case 'Tops':
        return <Shirt className="w-4 h-4 text-purple-400" />;
      case 'Bottoms':
        return <Layers className="w-4 h-4 text-indigo-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
    }
  };

  const confidencePercent = Math.round(garment.confidence * 100);

  return (
    <div className="bg-white/5 hover:bg-white/8 transition-colors border border-white/10 rounded-xl p-3 flex flex-col gap-1.5 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-white/5">{getIcon()}</div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
            {garment.category}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">
          {confidencePercent}% match
        </span>
      </div>

      <div className="text-white text-xs sm:text-sm font-semibold tracking-tight">
        {garment.description}
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border border-white/20 bg-zinc-600" />
          <span>{garment.color}</span>
        </div>

        {garment.highlight && (
          <span className="text-pink-400 text-[10px] bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-md font-medium">
            {garment.highlight}
          </span>
        )}
      </div>
    </div>
  );
};
