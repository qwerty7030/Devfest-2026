import type { OutfitClip } from '../../../lib/fitcheck/types';

export interface OutfitClipSource {
  start(onClip: (clip: OutfitClip) => void, onStatus: (message: string) => void): () => void;
}

const CLIP_MS = 2500;
const FRAME_MS = 500;
const MAX_VIDEO_BYTES = 4_000_000;

async function base64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

/** Each MediaRecorder is finalized before upload, so every clip has its own container header. */
export function createOutfitClipSource(getVideo: () => HTMLVideoElement | null, captureFrame: () => string | null): OutfitClipSource {
  return { start(onClip, onStatus) {
    let stopped = false;
    let recorder: MediaRecorder | null = null;
    let recording = true;
    let stopTimer: ReturnType<typeof setTimeout>;
    let frameTimer: ReturnType<typeof setInterval>;
    let startupTimer: ReturnType<typeof setTimeout>;
    let fallbackStarted = false;
    const started = Date.now();

    const fallback = () => {
      if (stopped || fallbackStarted) return;
      fallbackStarted = true;
      recording = false;
      clearTimeout(stopTimer);
      if (recorder?.state === 'recording') recorder.stop();
      onStatus('Watching your outfit as you move…');
      let frames: { frame: string; at: number }[] = [];
      const sample = () => {
        if (stopped) return;
        const frame = captureFrame();
        if (!frame) return;
        const at = Date.now();
        if (frames.length && at <= frames.at(-1)!.at) return;
        frames.push({ frame, at });
        if (frames.length < 6) return;
        const first = frames[0].at;
        onClip({ frames: frames.map(f => ({ frame: f.frame, offsetMs: f.at - first })), durationMs: frames.at(-1)!.at - first });
        frames = frames.slice(-2);
      };
      sample(); frameTimer = setInterval(sample, FRAME_MS);
    };

    const begin = () => {
      if (stopped || !recording) return;
      const video = getVideo();
      const stream = video?.srcObject as MediaStream | null;
      if (!video || video.readyState < 2 || !stream?.getVideoTracks?.().length) {
        if (Date.now() - started > 5000) { fallback(); return; }
        startupTimer = setTimeout(begin, 200);
        return;
      }
      if (typeof MediaRecorder === 'undefined') { fallback(); return; }
      // MP4/H.264 was verified against the live provider. Older browsers use
      // a timestamped clip sequence rather than risking slow WebM decoding.
      const mimeType = ['video/mp4', 'video/mp4;codecs=avc1.42E01E'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) { fallback(); return; }
      try {
        const current = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_000_000 });
        recorder = current;
        const chunks: Blob[] = [];
        const clipStarted = Date.now();
        current.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        current.onerror = fallback;
        current.onstop = () => {
          if (stopped || !recording) return;
          const durationMs = Date.now() - clipStarted;
          const blob = new Blob(chunks, { type: current.mimeType.split(';')[0] });
          // Capture the next independent clip while the last one is encoded/analyzed.
          begin();
          if (!blob.size || blob.size > MAX_VIDEO_BYTES || durationMs > 6000) {
            onStatus('That moment was too long or too large. Watching the next one…');
            return;
          }
          void base64(blob).then(data => {
            if (!stopped) onClip({ video: { data, mimeType: blob.type as 'video/webm' | 'video/mp4' }, durationMs });
          }).catch(() => { if (!stopped) fallback(); });
        };
        current.start();
        stopTimer = setTimeout(() => { if (current.state === 'recording') current.stop(); }, CLIP_MS);
      } catch { fallback(); }
    };
    begin();
    return () => {
      stopped = true;
      clearTimeout(stopTimer); clearTimeout(startupTimer); clearInterval(frameTimer);
      if (recorder?.state === 'recording') recorder.stop();
      // The camera belongs to useCamera; stopping a live session must not stop its tracks.
    };
  } };
}
