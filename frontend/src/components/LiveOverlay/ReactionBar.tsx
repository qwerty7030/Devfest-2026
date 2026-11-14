import React, { useState } from 'react';
import { Heart, Send } from 'lucide-react';
import { soundEffects } from '../../services/soundEffects';

interface ReactionBarProps {
  onSendComment: (text: string) => void;
  onSendReaction: (emoji: string) => void;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({
  onSendComment,
  onSendReaction,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendComment(inputText.trim());
    setInputText('');
  };

  const handleHeartClick = () => {
    soundEffects.playPop();
    onSendReaction('❤️');
  };

  const handleFireClick = () => {
    soundEffects.playPop();
    onSendReaction('🔥');
  };

  const handleHundredClick = () => {
    soundEffects.playPop();
    onSendReaction('💯');
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center gap-2">
      {/* Comment Input Box */}
      <form onSubmit={handleSubmit} className="flex-1 flex items-center relative">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Comment as @you..."
          className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm rounded-full pl-4 pr-10 py-2.5 outline-none border border-white/15 focus:border-pink-500/60 placeholder:text-zinc-400 transition-all"
        />
        {inputText.trim() && (
          <button
            type="submit"
            className="absolute right-2.5 p-1 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {/* Quick Emoji Reaction Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleFireClick}
          aria-label="Send flame reaction"
          className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 active:scale-90 border border-white/10 text-sm flex items-center justify-center transition-transform backdrop-blur-md"
        >
          🔥
        </button>
        <button
          onClick={handleHundredClick}
          aria-label="Send hundred reaction"
          className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 active:scale-90 border border-white/10 text-xs flex items-center justify-center transition-transform backdrop-blur-md"
        >
          💯
        </button>

        {/* Primary Pink Heart Spam Button */}
        <button
          onClick={handleHeartClick}
          aria-label="Send heart reaction"
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 active:scale-80 shadow-lg shadow-pink-600/40 text-white flex items-center justify-center transition-all duration-150"
        >
          <Heart className="w-5 h-5 fill-white" />
        </button>
      </div>
    </div>
  );
};
