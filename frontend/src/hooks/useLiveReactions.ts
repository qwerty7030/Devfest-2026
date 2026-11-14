import { useState, useCallback, useRef, useEffect } from 'react';
import type { LiveComment, FloatingReaction } from '../types/fitCheck';

export function useLiveReactions() {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [viewerCount, setViewerCount] = useState<number>(1420);
  const viewerTimerRef = useRef<number | null>(null);

  const addComment = useCallback((newComment: LiveComment) => {
    setComments((prev) => {
      const updated = [...prev, newComment];
      if (updated.length > 50) {
        return updated.slice(updated.length - 50);
      }
      return updated;
    });
  }, []);

  const triggerReaction = useCallback((emoji: string = '❤️') => {
    const id = 'rx_' + Math.random().toString(36).substring(2, 9) + Date.now();
    // Randomize horizontal offset (0% to 100% of container)
    const xOffsetPercent = Math.floor(Math.random() * 85);
    const scale = 0.85 + Math.random() * 0.45;
    const durationSec = 2.8 + Math.random() * 0.8;

    const newReaction: FloatingReaction = {
      id,
      emoji,
      xOffsetPercent,
      scale,
      durationSec,
    };

    setReactions((prev) => [...prev, newReaction]);

    // Automatically remove after animation completes
    window.setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, durationSec * 1000);
  }, []);

  const triggerBurst = useCallback((emoji: string = '❤️', count: number = 5) => {
    for (let i = 0; i < count; i++) {
      window.setTimeout(() => {
        triggerReaction(emoji);
      }, i * 90);
    }
  }, [triggerReaction]);

  const clearLiveState = useCallback(() => {
    setComments([]);
    setReactions([]);
    setViewerCount(1420);
    if (viewerTimerRef.current) {
      window.clearInterval(viewerTimerRef.current);
      viewerTimerRef.current = null;
    }
  }, []);

  const startViewerCounter = useCallback(() => {
    if (viewerTimerRef.current) window.clearInterval(viewerTimerRef.current);
    setViewerCount(Math.floor(1380 + Math.random() * 120));

    viewerTimerRef.current = window.setInterval(() => {
      setViewerCount((prev) => {
        // Natural organic upward momentum with occasional dips
        const delta = Math.floor(Math.random() * 32) - 8;
        return Math.max(1200, Math.min(prev + delta, 3850));
      });
    }, 1200);
  }, []);

  const stopViewerCounter = useCallback(() => {
    if (viewerTimerRef.current) {
      window.clearInterval(viewerTimerRef.current);
      viewerTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (viewerTimerRef.current) window.clearInterval(viewerTimerRef.current);
    };
  }, []);

  return {
    comments,
    reactions,
    viewerCount,
    addComment,
    triggerReaction,
    triggerBurst,
    clearLiveState,
    startViewerCounter,
    stopViewerCounter,
  };
}
