// Copied from lib/fitcheck/localComments.ts (backend repo root).
import type { Tone } from './commentQueue';

type Line = { text: string; tone: Tone };

/** Shown the instant recording starts, before Gemini answers. */
export const ENTERED_LINES: Line[] = [
  { text: 'OMG HI 😭', tone: 'hype' },
  { text: 'FIT CHECK 🔥🔥', tone: 'hype' },
  { text: 'wait who is this', tone: 'question' },
  { text: "ok we're live!!", tone: 'hype' },
  { text: 'spin for us 🙏', tone: 'hype' },
  { text: 'the entrance 😍', tone: 'hype' },
  { text: 'let\'s seeeee', tone: 'hype' },
  { text: '👀👀👀', tone: 'emoji' },
];

/** Filler while waiting on Gemini or if the API fails. Generic on purpose. */
export const FILLER_LINES: Line[] = [
  { text: '🔥🔥🔥', tone: 'emoji' },
  { text: 'obsessed', tone: 'hype' },
  { text: 'this is a vibe', tone: 'hype' },
  { text: '😍😍', tone: 'emoji' },
  { text: 'need a full tour', tone: 'question' },
  { text: 'ate fr', tone: 'hype' },
  { text: 'fit is clean', tone: 'hype' },
  { text: '💯', tone: 'emoji' },
  { text: 'turn around!!', tone: 'hype' },
  { text: 'link??', tone: 'question' },
];

export function sample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/** Occasional chatter when nobody is in frame. */
export const IDLE_LINES: Line[] = [
  { text: 'hello??', tone: 'question' },
  { text: "where'd you go 😭", tone: 'question' },
  { text: 'is this thing on', tone: 'question' },
  { text: 'waiting for the fit…', tone: 'hype' },
  { text: '👀', tone: 'emoji' },
  { text: 'come back!!', tone: 'hype' },
  { text: 'who\'s next 👀', tone: 'question' },
];
