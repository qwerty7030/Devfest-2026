import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { FitResult } from '../../types/fitCheck';
import { soundEffects } from '../../services/soundEffects';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Tag,
  Share2,
  RotateCcw,
  Sparkles,
  Download,
  Check,
} from 'lucide-react';

interface InstagramPostCardProps {
  result: FitResult;
  onReset: () => void;
  onRetake: () => void;
}

export const InstagramPostCard: React.FC<InstagramPostCardProps> = ({
  result,
  onReset,
  onRetake,
}) => {
  const photos = result.capturedPhotos.length > 0
    ? result.capturedPhotos
    : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80'];

  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(result.likesCount || 1842);
  const [showTags, setShowTags] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [localComments, setLocalComments] = useState(result.topComments);

  useEffect(() => {
    soundEffects.playResultFanfare();
    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#a855f7', '#3b82f6', '#f59e0b'],
      });
    } catch {
      // Confetti fallback
    }
  }, []);

  const handleToggleLike = () => {
    soundEffects.playPop();
    setIsLiked((prev) => {
      const next = !prev;
      setLikesCount((c) => (next ? c + 1 : c - 1));
      return next;
    });
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIdx((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIdx((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleShare = async () => {
    const text = `Check out my oko look! Scored ${result.overallScore}/100 (${result.archetype}) on oko at DevFest 2026.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My oko look', text });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const activePhoto = photos[currentPhotoIdx];
    const a = document.createElement('a');
    a.href = activePhoto;
    a.download = `oko-look-${Date.now()}.jpg`;
    a.click();
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const newC = {
      id: 'c_' + Date.now(),
      username: 'you',
      comment: commentInput.trim(),
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      badge: 'Host',
      timeAgo: 'Just now',
      likes: 1,
    };
    setLocalComments((prev) => [newC, ...prev]);
    setCommentInput('');
    soundEffects.playPop();
  };

  return (
    <div className="absolute inset-0 z-30 bg-zinc-950 text-white overflow-y-auto no-scrollbar flex flex-col justify-between select-none">
      {/* Top Banner Navigation */}
      <div className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-pink-400 font-mono text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>New Post Generated</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Post Card Container */}
      <div className="flex-1 pb-20">
        {/* Instagram Post Box */}
        <article className="w-full bg-black border-y border-white/10 sm:border sm:rounded-2xl sm:my-3 overflow-hidden shadow-2xl">
          {/* Post Header: Profile & Location */}
          <div className="flex items-center justify-between px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              {/* Profile Avatar with Instagram Gradient Ring */}
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="You"
                  className="w-8 h-8 rounded-full object-cover border-2 border-black"
                />
              </div>

              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs tracking-tight text-white">
                    you
                  </span>
                  <span className="w-1 h-1 rounded-full bg-zinc-500" />
                  <span className="text-[11px] font-semibold text-pink-400">
                    Follow
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400">
                  DevFest 2026 • oko
                </span>
              </div>
            </div>

            <button className="text-zinc-400 hover:text-white p-1">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Post Image Carousel Area */}
          <div
            className="relative w-full aspect-[4/5] bg-zinc-900 overflow-hidden cursor-pointer"
            onClick={() => setShowTags((prev) => !prev)}
          >
            <img
              src={photos[currentPhotoIdx]}
              alt={`oko pose ${currentPhotoIdx + 1}`}
              className="w-full h-full object-cover object-center"
            />

            {/* oko watermark badge on Top Right */}
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md border border-pink-500/40 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
              <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-amber-300">
                {result.overallScore}/100 DRIP
              </span>
            </div>

            {/* Carousel Navigation Arrows if multiple photos */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-sm transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-sm transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Interactive Outfit Tag Pills */}
            {showTags && (
              <div className="absolute inset-0 pointer-events-none">
                {result.garments.map((g, idx) => (
                  <div
                    key={idx}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md border border-white/20 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-xl flex items-center gap-1.5 animate-in fade-in zoom-in-75 duration-200"
                    style={{
                      left: `${g.tagXPercent || 50}%`,
                      top: `${g.tagYPercent || 30 + idx * 16}%`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                    <span>{g.description}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tag Button / Indicator at Bottom Left */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
              <Tag className="w-3 h-3 text-pink-400" />
              <span>{showTags ? 'Hide Outfit Tags' : 'Tap to View Tags'}</span>
            </div>

            {/* Photo Index Counter at Top Left */}
            {photos.length > 1 && (
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/10">
                {currentPhotoIdx + 1}/{photos.length}
              </div>
            )}
          </div>

          {/* Engagement Action Bar */}
          <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleToggleLike}
                className="transition-transform active:scale-75"
                title="Like post"
              >
                <Heart
                  className={`w-6 h-6 transition-colors ${
                    isLiked
                      ? 'fill-rose-500 text-rose-500 animate-[ping_0.2s_ease-out]'
                      : 'text-white hover:text-zinc-300'
                  }`}
                />
              </button>

              <button className="text-white hover:text-zinc-300 transition-colors">
                <MessageCircle className="w-6 h-6" />
              </button>

              <button
                onClick={handleShare}
                className="text-white hover:text-zinc-300 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Carousel Dots Indicator in center if multiple photos */}
            {photos.length > 1 && (
              <div className="flex items-center gap-1">
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentPhotoIdx ? 'bg-sky-400 w-3' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}

            <button
              onClick={handleDownload}
              className="text-white hover:text-zinc-300 transition-colors"
              title="Save Image"
            >
              <Bookmark className="w-5 h-5" />
            </button>
          </div>

          {/* Likes Count */}
          <div className="px-3.5 text-left">
            <span className="text-xs font-bold text-white">
              Liked by <strong className="font-extrabold">hypebeast_marcus</strong> and{' '}
              <strong className="font-extrabold">{likesCount.toLocaleString()} others</strong>
            </span>
          </div>

          {/* Caption */}
          <div className="px-3.5 pt-1.5 text-left text-xs leading-relaxed text-zinc-200">
            <span className="font-bold text-white mr-1.5">you</span>
            <span className="whitespace-pre-line">{result.caption}</span>
          </div>

          {/* TOP COMMENTS SECTION */}
          <div className="px-3.5 pt-3 pb-2 text-left flex flex-col gap-2 border-t border-white/5 mt-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Top Live Comments</span>
              <span className="text-zinc-500 font-mono text-[10px]">
                {localComments.length} highlighted
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {localComments.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <img
                      src={c.avatarUrl}
                      alt={c.username}
                      className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5 border border-white/10"
                    />
                    <div className="text-xs text-zinc-200 leading-snug">
                      <span className="font-bold text-white mr-1.5">
                        {c.username}
                      </span>
                      {c.badge && (
                        <span className="text-[8px] bg-pink-500/20 text-pink-400 px-1 py-0.2 rounded font-mono font-bold uppercase mr-1.5">
                          {c.badge}
                        </span>
                      )}
                      <span>{c.comment}</span>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-0.5">
                        <span>{c.timeAgo}</span>
                        <span>{c.likes} likes</span>
                        <span className="hover:text-white cursor-pointer">Reply</span>
                      </div>
                    </div>
                  </div>

                  <button className="text-zinc-500 hover:text-rose-500 shrink-0 mt-1">
                    <Heart className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add a comment form */}
          <form onSubmit={handleAddComment} className="px-3.5 py-2.5 border-t border-white/10 flex items-center gap-2">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="You"
              className="w-6 h-6 rounded-full object-cover"
            />
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Add a comment as @you..."
              className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 outline-none"
            />
            {commentInput.trim() && (
              <button
                type="submit"
                className="text-pink-400 hover:text-pink-300 font-bold text-xs"
              >
                Post
              </button>
            )}
          </form>
        </article>
      </div>

      {/* Sticky Bottom Bar for Actions */}
      <div className="fixed sm:absolute bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 p-3 flex gap-2">
        <button
          onClick={onRetake}
          className="flex-1 py-3 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
          <span>Retake Photos</span>
        </button>

        <button
          onClick={handleDownload}
          className="flex-1 py-3 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-zinc-400" />
          <span>Save Post</span>
        </button>

        <button
          onClick={onReset}
          className="flex-1 py-3 px-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Check Another Fit</span>
        </button>
      </div>
    </div>
  );
};
