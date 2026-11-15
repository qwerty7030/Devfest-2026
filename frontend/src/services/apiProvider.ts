import type { FitResult, LiveComment } from '../types/fitCheck';
import type { CommentsResponse, OutfitClip, OutfitObservation } from '../../../lib/fitcheck/types';
import { randomUsername } from '../../../lib/fitcheck/fakeUsers';
import type { OutfitClipSource } from './clipCapture';
import { OutfitSession } from './outfitSession';

export async function analyzeFit(photo: string | string[], signal: AbortSignal, sessionId = crypto.randomUUID(), requestId = crypto.randomUUID()): Promise<FitResult> {
  const res = await fetch('/api/fitcheck/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshotsBase64: Array.isArray(photo) ? photo : [photo], sessionId, requestId }), signal });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Could not analyze your outfit. Please try again.');
  return { ...body.data, capturedPhotos: [], timestamp: Date.now() };
}

/** Capture continuously; analyze one complete clip at a time with a single latest-clip buffer. */
export function startLiveFeed(source: OutfitClipSource, onComment: (c: LiveComment) => void,
  onStatus: (status: string) => void, onObservations: (items: OutfitObservation[]) => void = () => {}, sessionId = crypto.randomUUID()) {
  const controller = new AbortController();
  const session = new OutfitSession();
  let latest: OutfitClip | null = null;
  const window: OutfitClip[] = [];
  let inFlight = false;
  let quotaPaused = false;
  let requests = 0;
  let collectorStopped = false;
  let nextAllowed = 0;
  let pumpTimer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (controller.signal.aborted || quotaPaused || requests >= 2 || inFlight || !latest || pumpTimer) return;
    pumpTimer = setTimeout(() => { pumpTimer = undefined; void pump(); }, Math.max(0, nextAllowed - Date.now()));
  };
  const pump = async () => {
    if (controller.signal.aborted || quotaPaused || requests >= 2 || inFlight || !latest) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') { latest = null; window.length = 0; return; }
    const clips = [...window]; latest = null; inFlight = true;
    requests++;
    nextAllowed = Date.now() + 10_000;
    try {
      const res = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clips, sessionId, requestId: crypto.randomUUID(), ...session.context() }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
      if (!res.ok) {
        const failure = await res.json().catch(() => null);
        if (res.status === 429) {
          if (failure?.code === 'APP_COOLDOWN') {
            requests--; // The server rejected this before contacting Gemini.
            nextAllowed = Date.now() + Math.max(1, Number(failure.retryAfterSeconds) || Number(res.headers.get('Retry-After')) || 10) * 1000;
            onStatus(typeof failure.error === 'string' ? failure.error : 'Cooling down before the next outfit check…');
            return;
          }
          onStatus(typeof failure?.error === 'string' ? failure.error : 'Gemini quota reached. Live analysis is paused.');
          quotaPaused = true;
          stopCollector();
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
      onStatus(requests >= 2
        ? session.inventory().length ? 'Outfit captured · playing your personalized feedback' : 'No outfit recognized after two checks. Start a new fit check in better light.'
        : present ? 'Following your outfit · fresh feedback as you show more' : 'Step into view and show off · your outfit is remembered');
    } catch (e) {
      if (!controller.signal.aborted) {
        const message = e instanceof Error ? e.message : 'Outfit feedback is reconnecting…';
        onStatus(message);
        nextAllowed = Math.max(nextAllowed, Date.now() + 10_000);
      }
    } finally {
      inFlight = false;
      if (requests >= 2) stopCollector();
      else schedule();
    }
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
    if (controller.signal.aborted || quotaPaused || collectorStopped || requests >= 2) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    window.push(clip); if (window.length > 2) window.shift();
    latest = clip; schedule();
  }, onStatus);
  const stopCollector = () => {
    if (collectorStopped) return;
    collectorStopped = true; stopCapture(); clearTimeout(pumpTimer); latest = null; window.length = 0;
  };
  const maxSession = setTimeout(() => {
    if (!collectorStopped && !controller.signal.aborted) { stopCollector(); onStatus('Live analysis window ended. Your existing outfit feedback is still available.'); }
  }, 30_000);
  return () => { controller.abort(); stopCollector(); clearTimeout(maxSession); clearInterval(delivery); session.clearPending(); };
}
