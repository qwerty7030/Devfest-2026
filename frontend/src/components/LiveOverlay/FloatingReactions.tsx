import React from 'react';
import type { FloatingReaction } from '../../types/fitCheck';

interface FloatingReactionsProps {
  reactions: FloatingReaction[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  return (
    <div className="absolute right-2 bottom-16 w-20 h-80 pointer-events-none overflow-hidden z-25 flex justify-center">
      {reactions.map((item) => (
        <div
          key={item.id}
          className="absolute bottom-0 animate-float-up will-change-transform select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
          style={{
            left: `${item.xOffsetPercent}%`,
            transform: `scale(${item.scale})`,
            animationDuration: `${item.durationSec}s`,
            fontSize: `${24 * item.scale}px`,
          }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
};
