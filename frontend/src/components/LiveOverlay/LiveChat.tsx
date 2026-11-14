import React, { useEffect, useRef } from 'react';
import type { LiveComment } from '../../types/fitCheck';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface LiveChatProps {
  comments: LiveComment[];
}

export const LiveChat: React.FC<LiveChatProps> = ({ comments }) => {
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  return (
    <div className="absolute bottom-20 left-0 right-16 z-20 max-h-[45vh] overflow-y-auto no-scrollbar pointer-events-auto px-4 pb-2 flex flex-col justify-end mask-radial">
      {/* Soft gradient mask overlay */}
      <div className="flex flex-col gap-2">
        {comments.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-2.5 transition-all duration-300 animate-[fadeIn_0.2s_ease-out] ${
              item.isHighlighted
                ? 'bg-gradient-to-r from-pink-500/25 via-purple-500/20 to-transparent p-1.5 rounded-xl border-l-2 border-pink-400'
                : ''
            }`}
          >
            {/* User Avatar */}
            <img
              src={item.avatarUrl}
              alt={item.username}
              className="w-7 h-7 rounded-full object-cover border border-white/20 shrink-0 shadow-md mt-0.5"
            />

            {/* Comment Body */}
            <div className="flex flex-col max-w-[85%] text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-white/90 font-bold text-xs tracking-tight shadow-black drop-shadow-sm">
                  {item.username}
                </span>

                {/* Badge if available */}
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider flex items-center gap-0.5 ${
                      item.badge === 'VIP'
                        ? 'bg-amber-400/90 text-black'
                        : item.badge === 'Stylist'
                        ? 'bg-purple-500/90 text-white'
                        : item.badge === 'Verified'
                        ? 'bg-sky-500/90 text-white'
                        : 'bg-pink-500/90 text-white'
                    }`}
                  >
                    {item.badge === 'Verified' ? (
                      <CheckCircle2 className="w-2.5 h-2.5" />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5" />
                    )}
                    <span>{item.badge}</span>
                  </span>
                )}
              </div>

              {/* Comment text */}
              <p className="text-white text-xs sm:text-[13px] leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-normal break-words mt-0.5">
                {item.comment}
              </p>
            </div>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>
    </div>
  );
};
