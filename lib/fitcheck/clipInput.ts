import type { Part } from '@google/genai';
import type { OutfitObservation } from './types';
import { ApiError, jpegFrame } from './validation';

export const MAX_CLIP_BODY_BYTES = 12_000_000;

/** Validate video container signatures and bounded sequences, not just claimed MIME types. */
export function clipParts(body: Record<string, unknown> | null): Part[] {
  if (!body || typeof body !== 'object') throw new ApiError('A short outfit clip is required.');
  if (body.clips) {
    if (!Array.isArray(body.clips) || !body.clips.length || body.clips.length > 2) throw new ApiError('Send one or two short outfit clips.');
    const duration = body.clips.reduce((sum, clip) => sum + (typeof clip?.durationMs === 'number' ? clip.durationMs : 0), 0);
    if (duration > 8000) throw new ApiError('The rolling outfit window must be at most 8 seconds.');
    return body.clips.flatMap((clip, index) => [{ text: `Outfit clip ${index + 1} of ${(body.clips as unknown[]).length}, in chronological order:` }, ...clipParts({ clip })]);
  }
  if (body.clip) {
    const clip = body.clip as Record<string, unknown>;
    if (typeof clip.durationMs !== 'number' || clip.durationMs < 500 || clip.durationMs > 6000) throw new ApiError('Send a clip between 0.5 and 6 seconds.');
    if (clip.video) {
      const video = clip.video as Record<string, unknown>;
      if (typeof video.data !== 'string' || video.data.length > 5_333_336 || !/^[A-Za-z0-9+/]+={0,2}$/.test(video.data)) throw new ApiError('Invalid or oversized video clip.', 400);
      const bytes = Buffer.from(video.data, 'base64');
      const webm = video.mimeType === 'video/webm' && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
      const mp4 = video.mimeType === 'video/mp4' && bytes.subarray(4, 8).toString() === 'ftyp';
      if (bytes.length > 4_000_000 || (!webm && !mp4)) throw new ApiError('The clip must be a valid WebM or MP4 video.');
      return [{ inlineData: { mimeType: video.mimeType as string, data: video.data }, videoMetadata: { fps: 1 } }];
    }
    if (!Array.isArray(clip.frames) || clip.frames.length < 2 || clip.frames.length > 6) throw new ApiError('Send 2–6 ordered frames from your outfit clip.');
    let previous = -1;
    return clip.frames.flatMap((item): Part[] => {
      if (!item || typeof item !== 'object' || typeof item.offsetMs !== 'number' || item.offsetMs <= previous || item.offsetMs > clip.durationMs!) throw new ApiError('Clip frame timestamps must be ordered and within its duration.');
      previous = item.offsetMs;
      return [{ text: `Clip frame at ${(item.offsetMs / 1000).toFixed(2)} seconds:` }, { inlineData: { mimeType: 'image/jpeg', data: jpegFrame(item.frame) } }];
    });
  }
  // The backend diagnostic screen can still submit a single frame.
  return [{ inlineData: { mimeType: 'image/jpeg', data: jpegFrame(body.frame) } }];
}

export function knownOutfit(value: unknown): OutfitObservation[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).flatMap(i => i && typeof i === 'object' && typeof i.id === 'string' && typeof i.description === 'string'
    ? [{ id: i.id.slice(0, 30), category: typeof i.category === 'string' ? i.category.slice(0, 40) : '', description: i.description.slice(0, 160) }] : []);
}
