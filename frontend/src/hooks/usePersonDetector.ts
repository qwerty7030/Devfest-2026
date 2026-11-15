// Adapted from lib/fitcheck/usePersonDetector.ts (backend repo root).
import { useEffect, useState, type RefObject } from 'react';
import type { ObjectDetector } from '@mediapipe/tasks-vision';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';

interface DetectorOptions {
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
 * row, false once nobody has been seen for `exitAfterMs`. Load failures are
 * non-fatal: `present` stays false and `error` is set (manual start still works).
 */
export function usePersonDetector(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  {
    intervalMs = 200,
    enterHits = 5, // ~1s of steady detection before going live
    exitAfterMs = 4000, // leaning out or a 360° turn doesn't end the session
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
    let timer: number | null = null;
    let cancelled = false;
    let hits = 0;
    let lastSeen = 0;
    let isPresent = false;

    (async () => {
      try {
        const { FilesetResolver, ObjectDetector } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        const make = (delegate: 'GPU' | 'CPU') =>
          ObjectDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: 'VIDEO',
            scoreThreshold,
            categoryAllowlist: ['person'],
            maxResults: 3,
          });
        detector = await make('GPU').catch(() => make('CPU'));
        if (cancelled) {
          detector.close();
          return;
        }
        setReady(true);
        console.info('[usePersonDetector] ready');

        timer = window.setInterval(() => {
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
        console.warn('[usePersonDetector] detector unavailable; use the Go Live button', e);
        setError('Person detection unavailable. Use Go Live.');
      }
    })();

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      detector?.close();
      setPresent(false);
      setReady(false);
    };
  }, [videoRef, enabled, intervalMs, enterHits, exitAfterMs, minHeightFraction, scoreThreshold]);

  return { present, ready, error };
}
