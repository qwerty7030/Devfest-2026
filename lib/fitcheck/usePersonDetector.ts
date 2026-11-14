"use client";

import { useEffect, useState, type RefObject } from "react";
import type { ObjectDetector } from "@mediapipe/tasks-vision";

interface DetectorOptions {
  /** Detection runs this often. ~5 fps is plenty. */
  intervalMs?: number;
  /** Consecutive hits needed before we say someone entered. */
  enterHits?: number;
  /** How long with no person before we say they left. */
  exitAfterMs?: number;
  /** Ignore tiny people in the background: box must be at least this fraction of frame height. */
  minHeightFraction?: number;
  scoreThreshold?: number;
}

/**
 * Runs MediaPipe's on-device object detector on the video and reports a
 * debounced `present` flag: true once a person has been seen a few frames in a
 * row, false once they've been gone for a couple of seconds.
 */
export function usePersonDetector(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  {
    intervalMs = 200,
    enterHits = 3,
    exitAfterMs = 2000,
    minHeightFraction = 0.25,
    scoreThreshold = 0.5,
  }: DetectorOptions = {},
) {
  const [present, setPresent] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let detector: ObjectDetector | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let hits = 0;
    let lastSeen = 0;
    let isPresent = false;

    (async () => {
      try {
        const { FilesetResolver, ObjectDetector } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        const make = (delegate: "GPU" | "CPU") =>
          ObjectDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: "/models/efficientdet_lite0.tflite", delegate },
            runningMode: "VIDEO",
            scoreThreshold,
            categoryAllowlist: ["person"],
            maxResults: 3,
          });
        detector = await make("GPU").catch(() => make("CPU"));
        if (cancelled) {
          detector.close();
          return;
        }
        setReady(true);

        timer = setInterval(() => {
          const video = videoRef.current;
          if (!detector || !video || video.readyState < 2 || !video.videoHeight) return;
          const now = performance.now();
          const result = detector.detectForVideo(video, now);
          const minH = video.videoHeight * minHeightFraction;
          const seen = result.detections.some((d) => (d.boundingBox?.height ?? 0) >= minH);

          if (seen) {
            hits += 1;
            lastSeen = now;
            if (!isPresent && hits >= enterHits) {
              isPresent = true;
              setPresent(true);
            }
          } else {
            hits = 0;
            if (isPresent && now - lastSeen > exitAfterMs) {
              isPresent = false;
              setPresent(false);
            }
          }
        }, intervalMs);
      } catch (e) {
        console.error("[usePersonDetector]", e);
        setError("Person detector failed to load. Press space to go live manually.");
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      detector?.close();
    };
  }, [videoRef, enabled, intervalMs, enterHits, exitAfterMs, minHeightFraction, scoreThreshold]);

  return { present, ready, error };
}
