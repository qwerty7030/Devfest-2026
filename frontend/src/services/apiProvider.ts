import type { FitResult, LiveComment } from '../types/fitCheck';
import type { CommentsResponse, OutfitClip, OutfitObservation } from '../../../lib/fitcheck/types';
import { randomUsername } from '../../../lib/fitcheck/fakeUsers';
import type { OutfitClipSource } from './clipCapture';
import { OutfitSession } from './outfitSession';

export async function analyzeFit(photo: string, signal: AbortSignal): Promise<FitResult> {
  const res = await fetch('/api/fitcheck/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshotBase64: photo }), signal });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Could not analyze your outfit. Please try again.');
  return { ...body.data, capturedPhotos: [], timestamp: Date.now() };
}

/** Capture continuously; analyze one complete clip at a time with a single latest-clip buffer. */
export function startLiveFeed(source: OutfitClipSource, onComment: (c: LiveComment) => void,
  onStatus: (status: string) => void, onObservations: (items: OutfitObservation[]) => void = () => {}) {
  const controller = new AbortController();
  const session = new OutfitSession();
  let latest: OutfitClip | null = null;
  const window: OutfitClip[] = [];
  let inFlight = false;
  let quotaPaused = false;
  let nextAllowed = 0;
  let pumpTimer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (controller.signal.aborted || quotaPaused || inFlight || !latest || pumpTimer) return;
    pumpTimer = setTimeout(() => { pumpTimer = undefined; void pump(); }, Math.max(0, nextAllowed - Date.now()));
  };
  const pump = async () => {
    if (controller.signal.aborted || inFlight || !latest) return;
    const clips = [...window]; latest = null; inFlight = true;
    try {
      const res = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clips, ...session.context() }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
      if (!res.ok) {
        const failure = await res.json().catch(() => null);
        if (res.status === 429) {
          session.clearPending();
          onStatus(typeof failure?.error === 'string' ? failure.error : 'Gemini quota reached. Live analysis is paused.');
          quotaPaused = true;
          stopCapture();
          latest = null;
          window.length = 0;
          return;
        }
        throw new Error(typeof failure?.error === 'string' ? failure.error : 'Outfit feedback is reconnecting…');
      }
      const data: CommentsResponse = await res.json();
      if (controller.signal.aborted) return;
      const present = session.accept(data);
      onObservations(session.inventory());
      onStatus(present ? 'Following your outfit · fresh feedback as you show more' : 'Step into view and show off · your outfit is remembered');
      nextAllowed = Date.now() + 200;
    } catch (e) {
      if (!controller.signal.aborted) {
        const message = e instanceof Error ? e.message : 'Outfit feedback is reconnecting…';
        onStatus(message);
        nextAllowed = Date.now() + (/not configured/i.test(message) ? 10_000 : 2000);
      }
    } finally { inFlight = false; schedule(); }
  };
  const delivery = setInterval(() => {
    if (controller.signal.aborted) return;
    const next = session.next();
    if (!next) return;
    const { comment: c, details } = next;
    onComment({ id: crypto.randomUUID(), username: randomUsername(), avatarUrl: '/avatar.svg', comment: c.text,
      timestamp: Date.now(), badge: c.tone === 'critique' ? 'Try this' : 'Works well', tag: details,
      feedbackType: c.tone === 'critique' ? 'suggestion' : 'compliment', suggestion: c.suggestion || undefined });
  }, 1100);
  onObservations([]);
  onStatus('Show off naturally · watching the first moments of your outfit');
  const stopCapture = source.start(clip => {
    if (controller.signal.aborted || quotaPaused) return;
    window.push(clip); if (window.length > 2) window.shift();
    latest = clip; schedule();
  }, onStatus);
  return () => { controller.abort(); stopCapture(); clearTimeout(pumpTimer); clearInterval(delivery); latest = null; session.clearPending(); };
}
