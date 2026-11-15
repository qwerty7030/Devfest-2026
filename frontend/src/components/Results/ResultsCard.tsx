import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import type { FitResult } from '../../types/fitCheck';
import { GarmentBadge } from './GarmentBadge';
import { TopReactions } from './TopReactions';
import { soundEffects } from '../../services/soundEffects';
import { RotateCcw, Share2, Award, Sparkles, Check, Download } from 'lucide-react';

interface ResultsCardProps {
  result: FitResult;
  onReset: () => void;
  onRetake: () => void;
}

export const ResultsCard: React.FC<ResultsCardProps> = ({
  result,
  onReset,
  onRetake,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    soundEffects.playResultFanfare();

    // Trigger victory confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.55 },
        colors: ['#ec4899', '#a855f7', '#3b82f6', '#f59e0b'],
      });
    } catch {
      // Confetti fallback
    }
  }, []);

  const handleShare = async () => {
    const text = `🔥 Drip Score Score: ${result.overallScore}/100!\nStyle Archetype: ${result.archetype}\nRated on Drip Score AI at DevFest 2026.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Drip Score',
          text,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSnapshot = () => {
    if (!result.capturedSnapshotUrl) return;
    const a = document.createElement('a');
    a.href = result.capturedSnapshotUrl;
    a.download = `fit-check-${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="absolute inset-0 z-30 bg-zinc-950/95 backdrop-blur-xl overflow-y-auto no-scrollbar p-4 flex flex-col justify-between">
      {/* Scrollable Content */}
      <div className="flex flex-col gap-5 pt-3 pb-6">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-pink-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Drip Score Complete</span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* Big Drip Score & Archetype Card */}
        <div className="relative rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-pink-500/30 p-5 text-center shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Score Badge */}
          <div className="relative inline-flex items-center justify-center mb-3">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 p-1 shadow-lg shadow-pink-500/30">
              <div className="w-full h-full rounded-full bg-zinc-950 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-300">
                  {result.overallScore}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">
                  / 100 DRIP
                </span>
              </div>
            </div>
          </div>

          {/* Archetype */}
          <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Award className="w-3.5 h-3.5" />
            <span>Style Archetype</span>
          </div>
          <h2 className="text-white text-xl font-black tracking-tight mb-2">
            {result.archetype}
          </h2>

          {/* AI Summary paragraph */}
          <p className="text-zinc-300 text-xs leading-relaxed max-w-sm mx-auto">
            {result.summary}
          </p>
        </div>

        {/* Captured Fit Snapshot Preview */}
        {result.capturedSnapshotUrl && (
          <div className="relative rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
            <img
              src={result.capturedSnapshotUrl}
              alt="Fit Snapshot"
              className="w-full h-44 object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3">
              <span className="text-white text-xs font-semibold drop-shadow">
                Captured Fit Frame
              </span>
              <button
                onClick={handleDownloadSnapshot}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black text-white border border-white/20 transition-colors"
                title="Save Image"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Identified Garments Breakdown */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Gemini Vision Detections
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {result.garments.length} Pieces Tagged
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {result.garments.map((g, idx) => (
              <GarmentBadge key={idx} garment={g} />
            ))}
          </div>
        </div>

        {/* Crowd Highlights */}
        {result.topComments.length > 0 && (
          <TopReactions comments={result.topComments} />
        )}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="sticky bottom-0 pt-3 pb-1 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent flex gap-2">
        <button
          onClick={onRetake}
          className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white text-xs sm:text-sm font-semibold transition-all border border-white/10 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4 text-zinc-400" />
          <span>Quick Retake</span>
        </button>

        <button
          onClick={onReset}
          className="flex-2 py-3 px-5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Check Another Fit</span>
        </button>
      </div>
    </div>
  );
};
