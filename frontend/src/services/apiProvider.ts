import type { FitResult, LiveComment } from '../types/fitCheck';
import type { CommentsResponse } from '../../../lib/fitcheck/types';

export async function analyzeFit(photo: string, signal: AbortSignal): Promise<FitResult> {
  const res = await fetch('/api/fitcheck/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshotBase64: photo }), signal });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Could not analyze your outfit. Please try again.');
  return { ...body.data, capturedPhotos: [], timestamp: Date.now() };
}

/** One request at a time, cancellable, with paced delivery rather than a comment burst. */
export function startLiveFeed(capture: () => string | null, onComment: (c: LiveComment) => void,
  onStatus: (status: string) => void) {
  const controller = new AbortController();
  const recent: string[] = [];
  let timer: ReturnType<typeof setTimeout>;
  let pending: string[] = [];
  let index = 0;
  const poll = async () => {
    try {
      const photo = capture();
      if (!photo) throw new Error('Camera frame unavailable');
      const res = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: photo.replace(/^data:image\/jpeg;base64,/, ''), recent: recent.slice(-15) }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]) });
      if (!res.ok) throw new Error('Live reactions temporarily unavailable');
      const data: CommentsResponse = await res.json();
      if (controller.signal.aborted) return;
      pending = data.person_visible ? data.comments.map(c => c.text) : [];
      onStatus(data.person_visible ? 'AI audience · simulated viewers' : 'Show any part of your outfit for AI reactions');
    } catch {
      if (!controller.signal.aborted) onStatus('Live reactions offline · you can still take photos');
    } finally {
      if (!controller.signal.aborted) timer = setTimeout(poll, 4000);
    }
  };
  const delivery = setInterval(() => {
    const text = pending.shift();
    if (!text || controller.signal.aborted) return;
    recent.push(text);
    const users = ['palette.club', 'the.fit.editor', 'offduty.archive', 'studio.collective', 'daily.silhouette'];
    onComment({ id: crypto.randomUUID(), username: users[index++ % users.length], avatarUrl: '/avatar.svg',
      comment: text, timestamp: Date.now(), badge: 'AI audience' });
  }, 950);
  void poll();
  return () => { controller.abort(); clearTimeout(timer); clearInterval(delivery); pending = []; };
}
