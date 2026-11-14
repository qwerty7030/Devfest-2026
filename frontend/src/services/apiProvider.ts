import type { FitResult, LiveComment } from '../types/fitCheck';
import type { CommentsResponse, OutfitComment, OutfitObservation } from '../../../lib/fitcheck/types';
import { randomUsername } from '../../../lib/fitcheck/fakeUsers';

export async function analyzeFit(photo: string, signal: AbortSignal): Promise<FitResult> {
  const res = await fetch('/api/fitcheck/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshotBase64: photo }), signal });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Could not analyze your outfit. Please try again.');
  return { ...body.data, capturedPhotos: [], timestamp: Date.now() };
}

/** Only Gemini feedback grounded in visible clothing enters a real session's chat. */
export function startLiveFeed(capture: () => string | null, onComment: (c: LiveComment) => void,
  onStatus: (status: string) => void, onObservations: (items: OutfitObservation[]) => void = () => {}) {
  const controller = new AbortController();
  const recent: string[] = [];
  let timer: ReturnType<typeof setTimeout>;
  let pending: { comment: OutfitComment; details: string; seenAt: number }[] = [];
  let retryDelay = 3000;
  const poll = async () => {
    try {
      const photo = capture();
      if (!photo) { onStatus('Waiting for camera · stand in front of the lens'); return; }
      const res = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: photo.replace(/^data:image\/jpeg;base64,/, ''), recent: recent.slice(-15) }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
      if (!res.ok) {
        const failure = await res.json().catch(() => null);
        throw new Error(typeof failure?.error === 'string' ? failure.error : 'AI feedback unavailable. Retrying…');
      }
      const data: CommentsResponse = await res.json();
      if (controller.signal.aborted) return;
      const observations = Array.isArray(data.observations) ? data.observations.filter(i => i && typeof i.id === 'string' && typeof i.description === 'string') : [];
      onObservations(data.person_visible ? observations : []);
      if (!data.person_visible || !observations.length) {
        pending = [];
        onStatus('Stand in front of the camera with some clothing visible');
        return;
      }
      const seenAt = Date.now();
      const incoming = Array.isArray(data.comments) ? data.comments : [];
      for (const c of incoming) {
        if (!c || typeof c.text !== 'string' || !c.text.trim() || !Array.isArray(c.evidenceIds)) continue;
        if (c.tone !== 'hype' && c.tone !== 'critique') continue;
        if (c.tone === 'critique' && (typeof c.suggestion !== 'string' || !c.suggestion.trim())) continue;
        const evidence = observations.filter(i => c.evidenceIds.includes(i.id));
        if (!evidence.length || recent.includes(c.text) || pending.some(p => p.comment.text === c.text)) continue;
        pending.push({ comment: c, details: evidence.map(i => i.description).join(' · '), seenAt });
      }
      pending = pending.filter(p => seenAt - p.seenAt < 10_000).slice(0, 12);
      onStatus(pending.length ? 'Gemini sees your fit · compliments + constructive changes' : 'Looking closer at your outfit…');
    } catch (e) {
      if (!controller.signal.aborted) {
        pending = [];
        onObservations([]);
        const message = e instanceof Error ? e.message : 'AI feedback unavailable. Retrying…';
        onStatus(/not configured/i.test(message) ? 'Gemini API key is missing on the server · no outfit feedback yet' : message);
        if (/not configured/i.test(message)) retryDelay = 10_000;
      }
    } finally {
      if (!controller.signal.aborted) timer = setTimeout(poll, retryDelay);
    }
  };
  const delivery = setInterval(() => {
    if (controller.signal.aborted) return;
    pending = pending.filter(p => Date.now() - p.seenAt < 10_000);
    const next = pending.shift();
    if (!next) return;
    const { comment: c, details } = next;
    recent.push(c.text);
    if (recent.length > 20) recent.shift();
    onComment({ id: crypto.randomUUID(), username: randomUsername(), avatarUrl: '/avatar.svg', comment: c.text,
      timestamp: Date.now(), badge: c.tone === 'critique' ? 'Try this' : 'Works well', tag: details,
      feedbackType: c.tone === 'critique' ? 'suggestion' : 'compliment', suggestion: c.suggestion || undefined });
  }, 1100);
  onObservations([]);
  onStatus('Looking for your outfit · stand in front of the camera');
  void poll();
  return () => { controller.abort(); clearTimeout(timer); clearInterval(delivery); pending = []; };
}
