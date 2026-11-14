import { newId, randomUsername } from "./fakeUsers";
import type { LiveComment, Tone } from "./types";

export interface QueueInput {
  text: string;
  tone: Tone;
  source: "ai" | "local";
}

interface QueueOptions {
  minDelayMs: number;
  maxDelayMs: number;
  maxPending: number;
  /** How many recent texts to remember for de-duplication. */
  dedupeWindow: number;
}

const DEFAULTS: QueueOptions = { minDelayMs: 300, maxDelayMs: 1200, maxPending: 25, dedupeWindow: 60 };

const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Holds comments and releases them one at a time at random intervals, so a
 * batch of 10 from Gemini reads like a live chat instead of a wall of text.
 */
export class CommentQueue {
  private pending: LiveComment[] = [];
  private recentKeys: string[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private opts: QueueOptions;

  constructor(private onEmit: (c: LiveComment) => void, opts: Partial<QueueOptions> = {}) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  get size() {
    return this.pending.length;
  }

  /** Add comments. `front: true` puts them ahead of anything already queued. */
  push(items: QueueInput[], { front = false } = {}) {
    const fresh: LiveComment[] = [];
    for (const item of items) {
      const text = item.text.trim();
      if (!text) continue;
      const key = normalize(text);
      if (key && this.recentKeys.includes(key)) continue;
      if (key) this.recentKeys.push(key);
      fresh.push({
        id: newId(),
        username: randomUsername(),
        avatarSeed: Math.random().toString(36).slice(2, 10),
        text,
        tone: item.tone,
        source: item.source,
      });
    }
    if (this.recentKeys.length > this.opts.dedupeWindow) {
      this.recentKeys = this.recentKeys.slice(-this.opts.dedupeWindow);
    }
    this.pending = front ? [...fresh, ...this.pending] : [...this.pending, ...fresh];
    if (this.pending.length > this.opts.maxPending) {
      // Drop the oldest queued items; newer ones match the current outfit better.
      this.pending = this.pending.slice(-this.opts.maxPending);
    }
  }

  clear() {
    this.pending = [];
  }

  start() {
    if (this.timer) return;
    const tick = () => {
      const next = this.pending.shift();
      if (next) this.onEmit(next);
      const { minDelayMs, maxDelayMs } = this.opts;
      this.timer = setTimeout(tick, minDelayMs + Math.random() * (maxDelayMs - minDelayMs));
    };
    this.timer = setTimeout(tick, this.opts.minDelayMs);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
