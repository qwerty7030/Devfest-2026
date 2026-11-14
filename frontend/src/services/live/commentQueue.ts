// Copied from lib/fitcheck/commentQueue.ts (backend repo root), adapted for this
// project's tsconfig. Releases comments one at a time at random intervals so a
// batch of ~10 from Gemini reads like a live chat instead of a wall of text.

export type Tone = 'hype' | 'roast' | 'question' | 'emoji';

export interface QueuedComment {
  text: string;
  tone: Tone;
  tag?: string;
  source: 'ai' | 'local';
}

interface QueueOptions {
  minDelayMs: number;
  maxDelayMs: number;
  maxPending: number;
  dedupeWindow: number;
}

const DEFAULTS: QueueOptions = { minDelayMs: 350, maxDelayMs: 1000, maxPending: 25, dedupeWindow: 60 };

const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export class CommentQueue {
  private pending: QueuedComment[] = [];
  private recentKeys: string[] = [];
  private timer: number | null = null;
  private readonly onEmit: (c: QueuedComment) => void;
  private readonly opts: QueueOptions;

  constructor(onEmit: (c: QueuedComment) => void, opts: Partial<QueueOptions> = {}) {
    this.onEmit = onEmit;
    this.opts = { ...DEFAULTS, ...opts };
  }

  get size() {
    return this.pending.length;
  }

  push(items: QueuedComment[], { front = false } = {}) {
    const fresh: QueuedComment[] = [];
    for (const item of items) {
      const text = item.text.trim();
      if (!text) continue;
      const key = normalize(text);
      if (key && this.recentKeys.includes(key)) continue;
      if (key) this.recentKeys.push(key);
      fresh.push({ ...item, text });
    }
    if (this.recentKeys.length > this.opts.dedupeWindow) {
      this.recentKeys = this.recentKeys.slice(-this.opts.dedupeWindow);
    }
    this.pending = front ? [...fresh, ...this.pending] : [...this.pending, ...fresh];
    if (this.pending.length > this.opts.maxPending) {
      this.pending = this.pending.slice(-this.opts.maxPending);
    }
  }

  clear() {
    this.pending = [];
    this.recentKeys = [];
  }

  start() {
    if (this.timer !== null) return;
    const tick = () => {
      const next = this.pending.shift();
      if (next) this.onEmit(next);
      const { minDelayMs, maxDelayMs } = this.opts;
      this.timer = window.setTimeout(tick, minDelayMs + Math.random() * (maxDelayMs - minDelayMs));
    };
    this.timer = window.setTimeout(tick, this.opts.minDelayMs);
  }

  stop() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }
}
