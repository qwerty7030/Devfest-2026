"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { captureFrame } from "./captureFrame";
import { CommentQueue } from "./commentQueue";
import { ENTERED_LINES, FILLER_LINES, IDLE_LINES, sample } from "./localComments";
import type { CommentsResponse, FitCheckLive, FitResult, LiveComment, LiveState } from "./types";
import { useCamera } from "./useCamera";
import { usePersonDetector } from "./usePersonDetector";

const MAX_COMMENTS = 30;
const REFETCH_WHEN_QUEUE_BELOW = 5;
const MIN_FETCH_GAP_MS = 3000;
const LEFT_HOLD_MS = 5000;
const FILLER_GAP_MS = 1500;
const RECENT_FOR_PROMPT = 15;

interface Options {
  /** Space = forceEnter, Esc = reset. On by default. */
  keyboardShortcuts?: boolean;
  /** Turn off MediaPipe and rely only on forceEnter (the "cut if behind" fallback). */
  useDetector?: boolean;
}

export function useFitCheckLive({ keyboardShortcuts = true, useDetector = true }: Options = {}): FitCheckLive {
  const { videoRef, ready: cameraReady, error: cameraError } = useCamera();
  const detector = usePersonDetector(videoRef, useDetector && cameraReady);

  const [state, setState] = useState<LiveState>("EMPTY");
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [viewerCount, setViewerCount] = useState(37);
  const [lastResult, setLastResult] = useState<FitResult | null>(null);
  const [forced, setForced] = useState(false);

  // Refs so the timers always see current values without re-subscribing.
  const stateRef = useRef<LiveState>("EMPTY");
  const queueRef = useRef<CommentQueue | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef(0);
  const lastFillerRef = useRef(0);
  const recentAiRef = useRef<string[]>([]);
  const leftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((next: LiveState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // ---- comment queue (created once) ----
  useEffect(() => {
    const q = new CommentQueue((c) => {
      setComments((prev) => [...prev, c].slice(-MAX_COMMENTS));
      if (c.source === "ai") recentAiRef.current = [...recentAiRef.current, c.text].slice(-RECENT_FOR_PROMPT);
    });
    queueRef.current = q;
    q.start();
    return () => q.stop();
  }, []);

  // ---- one Gemini round trip ----
  const fetchBatch = useCallback(async () => {
    const video = videoRef.current;
    if (!video || inFlightRef.current) return;
    const frame = captureFrame(video);
    if (!frame) return;

    const controller = new AbortController();
    inFlightRef.current = controller;
    lastFetchRef.current = Date.now();
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame, recent: recentAiRef.current }),
        signal: controller.signal,
      });
      const data: CommentsResponse = await res.json();
      const s = stateRef.current;
      if (s !== "ENTERED" && s !== "LIVE") return; // person left while we waited
      if (!data.person_visible || data.comments.length === 0) return;

      queueRef.current?.push(data.comments.map((c) => ({ ...c, source: "ai" as const })));
      if (typeof data.rating === "number") {
        setLastResult({ rating: data.rating, vibe: data.vibe ?? "" });
      }
      if (s === "ENTERED") goTo("LIVE");
    } catch (e) {
      if ((e as Error).name !== "AbortError") console.warn("[useFitCheckLive] fetch failed", e);
    } finally {
      if (inFlightRef.current === controller) inFlightRef.current = null;
    }
  }, [videoRef, goTo]);

  // ---- presence → state transitions ----
  const present = detector.present || forced;

  useEffect(() => {
    const s = stateRef.current;
    if (present && (s === "EMPTY" || s === "LEFT")) {
      if (leftTimerRef.current) clearTimeout(leftTimerRef.current);
      queueRef.current?.clear();
      queueRef.current?.push(
        sample(ENTERED_LINES, 3).map((l) => ({ ...l, source: "local" as const })),
        { front: true },
      );
      recentAiRef.current = [];
      goTo("ENTERED");
      void fetchBatch();
    } else if (!present && (s === "ENTERED" || s === "LIVE")) {
      inFlightRef.current?.abort();
      queueRef.current?.clear();
      goTo("LEFT");
      leftTimerRef.current = setTimeout(() => {
        if (stateRef.current === "LEFT") goTo("EMPTY");
      }, LEFT_HOLD_MS);
    }
  }, [present, goTo, fetchBatch]);

  // ---- heartbeat: refetch, filler, idle chatter, viewer count ----
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      const s = stateRef.current;
      const q = queueRef.current;
      const now = Date.now();

      if ((s === "ENTERED" || s === "LIVE") && q) {
        if (q.size < REFETCH_WHEN_QUEUE_BELOW && now - lastFetchRef.current > MIN_FETCH_GAP_MS) {
          void fetchBatch();
        }
        // Never let the chat go silent while waiting on (or failing to reach) Gemini.
        if (q.size === 0 && now - lastFillerRef.current > FILLER_GAP_MS) {
          lastFillerRef.current = now;
          q.push(sample(FILLER_LINES, 1).map((l) => ({ ...l, source: "local" as const })));
        }
      } else if (s === "EMPTY" && q && Math.random() < 0.06) {
        q.push(sample(IDLE_LINES, 1).map((l) => ({ ...l, source: "local" as const })));
      }

      if (tick % 2 === 0) {
        setViewerCount((v) => {
          const target = s === "LIVE" ? 2400 : s === "ENTERED" ? 900 : s === "LEFT" ? 600 : 40;
          const rate = target > v ? 0.06 : 0.03;
          const noise = (Math.random() - 0.5) * Math.max(4, v * 0.02);
          return Math.max(1, Math.round(v + (target - v) * rate + noise));
        });
      }
    }, 500);
    return () => clearInterval(id);
  }, [fetchBatch]);

  // ---- controls ----
  const forceEnter = useCallback(() => setForced(true), []);

  const reset = useCallback(() => {
    setForced(false);
    inFlightRef.current?.abort();
    if (leftTimerRef.current) clearTimeout(leftTimerRef.current);
    queueRef.current?.clear();
    recentAiRef.current = [];
    setComments([]);
    setLastResult(null);
    goTo("EMPTY");
  }, [goTo]);

  useEffect(() => {
    if (!keyboardShortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        forceEnter();
      } else if (e.code === "Escape") {
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboardShortcuts, forceEnter, reset]);

  return {
    videoRef,
    state,
    comments,
    viewerCount,
    lastResult,
    error: cameraError ?? detector.error,
    forceEnter,
    reset,
  };
}
