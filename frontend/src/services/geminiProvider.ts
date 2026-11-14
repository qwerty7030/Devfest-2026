import type { FitCheckProvider } from './fitCheckProvider';
import type { FitResult, LiveComment } from '../types/fitCheck';
import { MOCK_USERS, mockFitCheckProvider } from './mockProvider';
import { CommentQueue, type QueuedComment, type Tone } from './live/commentQueue';
import { ENTERED_LINES, FILLER_LINES, IDLE_LINES, sample } from './live/localComments';
import { captureFrame, stripDataUrl } from './live/captureFrame';
import { randomUsername } from './live/fakeUsers';

/**
 * Real provider: sends webcam frames to the Gemini backend (Next.js app at the
 * repo root, proxied at /api by vite.config.ts) and streams back outfit comments.
 *
 * Never lets the stream die: canned lines cover the first Gemini round trip,
 * filler covers slow or failed calls, and analyzeFit falls back to the mock.
 * Quota-friendly: ~1 call per 6s while someone is live, none while the tab is
 * hidden, and none at all while the backend says every model is rate-limited.
 */

const REFETCH_WHEN_QUEUE_BELOW = 4;
const MIN_FETCH_GAP_MS = 6000;
const FILLER_GAP_MS = 1800;
const RECENT_FOR_PROMPT = 15;
const ANALYZE_TIMEOUT_MS = 12000;
const REACTION_EMOJIS = ['❤️', '🔥', '👏', '✨', '💯', '😍', '👀'];

interface CommentsApiResponse {
  person_visible: boolean;
  comments: { text: string; tone: Tone; tag?: string }[];
  retryAfterMs?: number;
}

interface AnalyzeApiResponse {
  status: 'success' | 'error';
  data?: Omit<FitResult, 'timestamp' | 'capturedSnapshotUrl'>;
  retryAfterMs?: number;
}

const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const tabVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

export class GeminiFitCheckProvider implements FitCheckProvider {
  private getVideo: () => HTMLVideoElement | null = () => null;
  private queue: CommentQueue | null = null;
  private heartbeat: number | null = null;
  private reactionTimer: number | null = null;
  private inFlight: AbortController | null = null;
  private lastFetch = 0;
  private lastFiller = 0;
  /** Backend said every model is rate-limited: no Gemini calls before this time. */
  private pausedUntil = 0;
  private recentAi: string[] = [];
  /** 768px JPEG (base64) of the latest frame where Gemini confirmed a person. */
  private lastGoodFrame: string | null = null;
  private onComment: ((c: LiveComment) => void) | null = null;
  private onReaction: ((emoji: string) => void) | null = null;

  /** App.tsx calls this once so the provider can grab frames from the camera. */
  setFrameSource(getVideo: () => HTMLVideoElement | null) {
    this.getVideo = getVideo;
  }

  /** Data URL of the last frame where a person was visible (for the scanner / results photo). */
  getLastGoodFrameUrl(): string | undefined {
    return this.lastGoodFrame ? `data:image/jpeg;base64,${this.lastGoodFrame}` : undefined;
  }

  /** A canned "anyone there?" comment for the empty-room state. */
  idleComment(): LiveComment {
    return this.toLiveComment({ ...pick(IDLE_LINES), source: 'local' });
  }

  startLiveFeed(onComment: (comment: LiveComment) => void, onReaction: (emoji: string) => void): void {
    this.stopLiveFeed();
    this.onComment = onComment;
    this.onReaction = onReaction;
    this.recentAi = [];
    this.lastFetch = 0;
    this.lastGoodFrame = null;

    this.queue = new CommentQueue((c) => this.emit(c), { minDelayMs: 600, maxDelayMs: 1400 });
    this.queue.push(sample(ENTERED_LINES, 3).map((l) => ({ ...l, source: 'local' as const })));
    this.queue.start();

    void this.fetchBatch();
    this.heartbeat = window.setInterval(() => this.tick(), 500);
    this.scheduleReaction();
  }

  stopLiveFeed(): void {
    this.inFlight?.abort();
    this.inFlight = null;
    this.queue?.stop();
    this.queue = null;
    if (this.heartbeat !== null) window.clearInterval(this.heartbeat);
    if (this.reactionTimer !== null) window.clearTimeout(this.reactionTimer);
    this.heartbeat = null;
    this.reactionTimer = null;
    this.onComment = null;
    this.onReaction = null;
  }

  sendUserComment(commentText: string): LiveComment {
    return mockFitCheckProvider.sendUserComment(commentText);
  }

  /** Scores the outfit. Prefers the last frame where a person was confirmed, since they may have left by now. */
  async analyzeFit(snapshotBase64?: string): Promise<FitResult> {
    const video = this.getVideo();
    const frame =
      this.lastGoodFrame ??
      (snapshotBase64 ? stripDataUrl(snapshotBase64) : null) ??
      (video ? captureFrame(video, 768, 0.8) : null);
    const photo = this.getLastGoodFrameUrl() ?? snapshotBase64;
    if (!frame || Date.now() < this.pausedUntil) return this.mockResult(photo);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotBase64: frame, recentComments: this.recentAi }),
        signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
      });
      const body: AnalyzeApiResponse = await res.json();
      if (body.retryAfterMs) this.pausedUntil = Date.now() + body.retryAfterMs;
      if (body.status !== 'success' || !body.data) throw new Error('analyze returned error');
      return {
        ...body.data,
        topComments: body.data.topComments.map((c) => ({ ...c, avatarUrl: c.avatarUrl ?? pick(MOCK_USERS).avatar })),
        capturedSnapshotUrl: photo,
        timestamp: Date.now(),
      };
    } catch (e) {
      console.warn('[geminiProvider] analyze failed, using mock result', e);
      return this.mockResult(photo);
    }
  }

  // ---- internals ----

  private async mockResult(photo?: string): Promise<FitResult> {
    const r = await mockFitCheckProvider.analyzeFit(photo);
    return { ...r, capturedSnapshotUrl: photo };
  }

  private toLiveComment(c: QueuedComment): LiveComment {
    // Mix the mock's "known" users (with badges) and random usernames.
    const known = Math.random() < 0.3 ? pick(MOCK_USERS) : null;
    return {
      id: 'cmt_' + Math.random().toString(36).slice(2, 9),
      username: known?.username ?? randomUsername(),
      avatarUrl: known?.avatar ?? pick(MOCK_USERS).avatar,
      badge: known?.badge,
      comment: c.text,
      timestamp: Date.now(),
      tag: c.tag,
      isHighlighted: c.source === 'ai' && c.tone === 'hype' && Math.random() > 0.75,
    };
  }

  private emit(c: QueuedComment) {
    if (!this.onComment) return;
    this.onComment(this.toLiveComment(c));
    if (c.source === 'ai') this.recentAi = [...this.recentAi, c.text].slice(-RECENT_FOR_PROMPT);
    if (c.tone === 'hype' && this.onReaction) this.onReaction(Math.random() < 0.5 ? '🔥' : '❤️');
  }

  private tick() {
    const q = this.queue;
    if (!q) return;
    const now = Date.now();
    if (
      q.size < REFETCH_WHEN_QUEUE_BELOW &&
      !this.inFlight &&
      now - this.lastFetch > MIN_FETCH_GAP_MS &&
      now >= this.pausedUntil &&
      tabVisible()
    ) {
      void this.fetchBatch();
    }
    if (q.size === 0 && now - this.lastFiller > FILLER_GAP_MS) {
      this.lastFiller = now;
      q.push(sample(FILLER_LINES, 1).map((l) => ({ ...l, source: 'local' as const })));
    }
  }

  private async fetchBatch() {
    const video = this.getVideo();
    if (!video || this.inFlight || Date.now() < this.pausedUntil || !tabVisible()) return;
    const frame = captureFrame(video, 512, 0.7);
    if (!frame) return; // e.g. Virtual Demo Mode with no live video: filler only
    const candidate = captureFrame(video, 768, 0.8); // kept if Gemini confirms a person

    const controller = new AbortController();
    this.inFlight = controller;
    this.lastFetch = Date.now();
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame, recent: this.recentAi }),
        signal: controller.signal,
      });
      const data: CommentsApiResponse = await res.json();
      if (data.retryAfterMs) {
        this.pausedUntil = Date.now() + data.retryAfterMs;
        console.warn(`[geminiProvider] Gemini quota hit; pausing AI comments for ${Math.round(data.retryAfterMs / 1000)}s`);
      }
      if (!this.queue || !data.person_visible || !data.comments?.length) return;
      if (candidate) this.lastGoodFrame = candidate;
      this.queue.push(data.comments.map((c) => ({ ...c, source: 'ai' as const })));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.warn('[geminiProvider] comments fetch failed', e);
    } finally {
      if (this.inFlight === controller) this.inFlight = null;
    }
  }

  private scheduleReaction() {
    if (!this.onReaction) return;
    this.reactionTimer = window.setTimeout(() => {
      this.onReaction?.(pick(REACTION_EMOJIS));
      this.scheduleReaction();
    }, 400 + Math.random() * 700);
  }
}

export const geminiFitCheckProvider = new GeminiFitCheckProvider();
