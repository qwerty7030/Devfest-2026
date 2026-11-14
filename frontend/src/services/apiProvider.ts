import type { FitResult, LiveComment } from '../types/fitCheck';
import type { CommentsResponse } from '../../../lib/fitcheck/types';
import { randomUsername } from '../../../lib/fitcheck/fakeUsers';

export async function analyzeFit(photo: string, signal: AbortSignal): Promise<FitResult> {
  const res = await fetch('/api/fitcheck/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshotBase64: photo }), signal });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Could not analyze your outfit. Please try again.');
  return { ...body.data, capturedPhotos: [], timestamp: Date.now() };
}

const LOCAL_CHAT = [
  'we’re live! 👋', 'your runway, your rules', 'let’s see the fit ✨',
  'main character moment', 'show us your favorite detail', 'the chat has arrived 👀',
  'take your time, own the moment', 'bring that runway energy 🔥',
  'ready for the close-up', 'a little outfit tour?', 'your style gets the spotlight',
  'strike a pose 📸', 'here for the fit check', 'make this moment yours',
];

/** Immediate local chatter bridges camera/model latency; AI comments take priority. */
export function startLiveFeed(capture: () => string | null, onComment: (c: LiveComment) => void,
  onStatus: (status: string) => void) {
  const controller = new AbortController();
  const recent: string[] = [];
  let timer: ReturnType<typeof setTimeout>;
  let pending: string[] = [];
  let localIndex = 0;
  const emit = (text: string, ai: boolean) => {
    if (controller.signal.aborted) return;
    onComment({ id: crypto.randomUUID(), username: randomUsername(), avatarUrl: '/avatar.svg',
      comment: text, timestamp: Date.now(), badge: ai ? 'AI audience' : 'Simulated' });
  };
  const poll = async () => {
    try {
      const photo = capture();
      if (!photo) throw new Error('Camera frame unavailable');
      const res = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: photo.replace(/^data:image\/jpeg;base64,/, ''), recent: recent.slice(-15) }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]) });
      if (!res.ok) {
        const failure = await res.json().catch(() => null);
        throw new Error(typeof failure?.error === 'string' ? failure.error : 'AI reactions temporarily unavailable');
      }
      const data: CommentsResponse = await res.json();
      if (controller.signal.aborted) return;
      const incoming = data.person_visible && Array.isArray(data.comments)
        ? data.comments.flatMap(c => typeof c?.text === 'string' && c.text.trim() ? [c.text.trim().slice(0, 150)] : [])
        : [];
      // Preserve undelivered comments when another batch arrives.
      pending.push(...incoming.filter(text => !pending.includes(text) && !recent.includes(text)));
      pending = pending.slice(0, 24);
      onStatus(incoming.length ? 'AI audience · simulated viewers' : 'Simulated chat · show clothing for AI reactions');
    } catch (e) {
      if (!controller.signal.aborted) onStatus(e instanceof Error && /not configured/i.test(e.message)
        ? 'Simulated chat · server API key needed for AI'
        : 'Simulated chat · AI reconnecting');
    } finally {
      if (!controller.signal.aborted) timer = setTimeout(poll, 4000);
    }
  };
  const delivery = setInterval(() => {
    const text = pending.shift();
    if (controller.signal.aborted) return;
    if (text) {
      recent.push(text);
      if (recent.length > 20) recent.shift();
      emit(text, true);
    } else emit(LOCAL_CHAT[localIndex++ % LOCAL_CHAT.length], false);
  }, 950);
  onStatus('Simulated chat · connecting AI reactions');
  emit(LOCAL_CHAT[localIndex++ % LOCAL_CHAT.length], false);
  void poll();
  return () => { controller.abort(); clearTimeout(timer); clearInterval(delivery); pending = []; };
}
