"use client";

/**
 * Drop-in fake for useFitCheckLive, for building the UI before the real
 * pipeline is ready. Same return shape. Uses the real camera so you can see
 * yourself, but comments are canned and the state cycles on a timer:
 *   EMPTY (4s) → ENTERED (2s) → LIVE (20s) → LEFT (5s) → EMPTY …
 * Space / Esc work the same as the real hook.
 *
 * Swap:  import { useFitCheckLive } from "@/lib/fitcheck/useFitCheckLive.mock";
 *   →    import { useFitCheckLive } from "@/lib/fitcheck/useFitCheckLive";
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CommentQueue } from "./commentQueue";
import { ENTERED_LINES, FILLER_LINES, IDLE_LINES, sample } from "./localComments";
import type { FitCheckLive, FitResult, LiveComment, LiveState, Tone } from "./types";
import { useCamera } from "./useCamera";

const FAKE_AI: { text: string; tone: Tone }[] = [
  { text: "the green jacket is SO good", tone: "hype" },
  { text: "those sneakers are carrying the whole fit", tone: "hype" },
  { text: "where are the pants from??", tone: "question" },
  { text: "belt with that? bold choice 😭", tone: "roast" },
  { text: "layering is immaculate", tone: "hype" },
  { text: "the silver chain >>>", tone: "hype" },
  { text: "socks with those? we need to talk", tone: "roast" },
  { text: "color palette is so clean", tone: "hype" },
  { text: "is that vintage carhartt", tone: "question" },
  { text: "🔥🧥🔥", tone: "emoji" },
  { text: "baggy jeans era never ended", tone: "hype" },
  { text: "the cap kinda throws it off ngl", tone: "roast" },
];

const SCHEDULE: { state: LiveState; ms: number }[] = [
  { state: "EMPTY", ms: 4000 },
  { state: "ENTERED", ms: 2000 },
  { state: "LIVE", ms: 20000 },
  { state: "LEFT", ms: 5000 },
];

export function useFitCheckLive(): FitCheckLive {
  const { videoRef, error } = useCamera();
  const [state, setState] = useState<LiveState>("EMPTY");
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [viewerCount, setViewerCount] = useState(37);
  const [lastResult, setLastResult] = useState<FitResult | null>(null);
  const [step, setStep] = useState(0);
  const queueRef = useRef<CommentQueue | null>(null);

  useEffect(() => {
    const q = new CommentQueue((c) => setComments((prev) => [...prev, c].slice(-30)));
    queueRef.current = q;
    q.start();
    return () => q.stop();
  }, []);

  // Advance through the schedule.
  useEffect(() => {
    const { state: s, ms } = SCHEDULE[step % SCHEDULE.length];
    setState(s);
    const q = queueRef.current;
    if (s === "ENTERED") {
      q?.clear();
      q?.push(sample(ENTERED_LINES, 3).map((l) => ({ ...l, source: "local" as const })));
    } else if (s === "LIVE") {
      setLastResult({ rating: Math.round((6 + Math.random() * 4) * 10) / 10, vibe: "streetwear casual" });
    } else if (s === "LEFT") {
      q?.clear();
    }
    const t = setTimeout(() => setStep((n) => n + 1), ms);
    return () => clearTimeout(t);
  }, [step]);

  // Keep comments flowing while LIVE, idle chatter while EMPTY, viewer count drift.
  useEffect(() => {
    const id = setInterval(() => {
      const q = queueRef.current;
      if (state === "LIVE" && q && q.size < 3) {
        const pool = Math.random() < 0.8 ? FAKE_AI : FILLER_LINES;
        q.push(sample(pool, 4).map((l) => ({ ...l, source: pool === FAKE_AI ? ("ai" as const) : ("local" as const) })));
      } else if (state === "EMPTY" && q && Math.random() < 0.1) {
        q.push(sample(IDLE_LINES, 1).map((l) => ({ ...l, source: "local" as const })));
      }
      setViewerCount((v) => {
        const target = state === "LIVE" ? 2400 : state === "ENTERED" ? 900 : state === "LEFT" ? 600 : 40;
        return Math.max(1, Math.round(v + (target - v) * 0.05 + (Math.random() - 0.5) * Math.max(4, v * 0.02)));
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  const forceEnter = useCallback(() => setStep((n) => n - (n % SCHEDULE.length) + 1), []);
  const reset = useCallback(() => {
    queueRef.current?.clear();
    setComments([]);
    setLastResult(null);
    setStep((n) => n - (n % SCHEDULE.length));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        forceEnter();
      } else if (e.code === "Escape") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [forceEnter, reset]);

  return { videoRef, state, comments, viewerCount, lastResult, error, forceEnter, reset };
}
