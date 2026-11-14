import React from 'react';
import { MessageSquareQuote } from 'lucide-react';

interface TopReactionsProps {
  comments: {
    username: string;
    comment: string;
    avatarUrl?: string;
  }[];
}

export const TopReactions: React.FC<TopReactionsProps> = ({ comments }) => {
  return (
    <div className="flex flex-col gap-2 text-left">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pink-400">
        <MessageSquareQuote className="w-3.5 h-3.5" />
        <span>Crowd Highlights</span>
      </div>

      <div className="flex flex-col gap-2">
        {comments.map((c, i) => (
          <div
            key={i}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5 text-xs"
          >
            {c.avatarUrl && (
              <img
                src={c.avatarUrl}
                alt={c.username}
                className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-white/20"
              />
            )}
            <div className="flex flex-col">
              <span className="font-bold text-white/90 text-[11px]">
                @{c.username}
              </span>
              <p className="text-zinc-300 italic text-[11px] leading-snug">
                "{c.comment}"
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
