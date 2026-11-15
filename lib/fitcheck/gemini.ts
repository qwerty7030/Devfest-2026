import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";

// GEMINI_MODEL is a comma-separated fallback chain. Each model has its own
// per-day quota, so when one is exhausted (429) we move to the next.
// Benchmarked 2026-11-14: 3.5-flash-lite ~1s and reliable; 3.5-flash ~9s;
// 3.8-flash timed out / 503s. Re-run scripts/bench-models.mjs to re-check.
export const MODELS = (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite,gemini-3.1-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// GEMINI_THINKING: minimal | low | medium | high | off. Lower = faster. Not every
// model supports every level (gemini-3.8-flash rejects "minimal"); "off" omits
// the setting entirely and lets the model use its default.
const THINKING_LEVELS: Record<string, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};
const THINKING = THINKING_LEVELS[(process.env.GEMINI_THINKING ?? "low").toLowerCase()];

/** Spread into a generateContent config. */
export const thinkingConfig = THINKING ? { thinkingConfig: { thinkingLevel: THINKING } } : {};

/** ~1.5MB of JPEG. Far more than a 512–768px frame needs. */
export const MAX_FRAME_CHARS = 2_000_000;

let ai: GoogleGenAI | null = null;
export function gemini() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set (add it to .env or .env.local)");
  ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
}

// ---- model fallback + quota backoff ----

/** Thrown when every model in the chain is rate-limited or quota-exhausted. */
export class QuotaExhausted extends Error {
  constructor(public retryAfterMs: number) {
    super(`all Gemini models rate-limited; retry in ${formatMs(retryAfterMs)}`);
  }
}

/** model → epoch ms when it may be tried again */
const blockedUntil = new Map<string, number>();

const TRANSIENT_BLOCK_MS = 30_000; // 503 "high demand" and 429s without a retry hint

export function formatMs(ms: number) {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m${s % 60}s` : `${Math.floor(m / 60)}h${m % 60}m`;
}

/** Pulls "retryDelay":"123s" out of a Gemini error message, if present. */
function retryDelayMs(err: ApiError): number | null {
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(err.message);
  return match ? Math.ceil(Number(match[1]) * 1000) : null;
}

// ---- call-rate tracking (for logs) ----

/**
 * Timestamps of real Gemini requests in the last minute. Kept on globalThis
 * because Next loads each route as its own module in dev, and we want one
 * count across /api/comments and /api/analyze.
 */
const rate = globalThis as unknown as { __fitcheckCalls?: number[] };

function recordCall() {
  const now = Date.now();
  rate.__fitcheckCalls = (rate.__fitcheckCalls ?? []).filter((t) => now - t < 60_000);
  rate.__fitcheckCalls.push(now);
}

/** "14:03:22 calls/min=4" for log lines: makes runaway polling easy to spot. */
export function rateTag() {
  const now = Date.now();
  rate.__fitcheckCalls = (rate.__fitcheckCalls ?? []).filter((t) => now - t < 60_000);
  return `${new Date(now).toTimeString().slice(0, 8)} calls/min=${rate.__fitcheckCalls.length}`;
}

/**
 * generateContent across the MODELS chain. Skips models that are currently
 * blocked, blocks a model on 429 (for Google's retryDelay) or 503 (briefly),
 * and moves on to the next. Other errors are thrown immediately.
 */
export async function generateWithFallback(
  params: Omit<GenerateContentParameters, "model">,
): Promise<{ res: GenerateContentResponse; model: string }> {
  const now = Date.now();
  let lastError: unknown = null;

  for (const model of MODELS) {
    const until = blockedUntil.get(model) ?? 0;
    if (until > now) continue;
    try {
      recordCall();
      const res = await gemini().models.generateContent({ ...params, model });
      return { res, model };
    } catch (e) {
      if (e instanceof ApiError && (e.status === 429 || e.status === 503)) {
        const wait = e.status === 429 ? (retryDelayMs(e) ?? TRANSIENT_BLOCK_MS) : TRANSIENT_BLOCK_MS;
        blockedUntil.set(model, Date.now() + wait);
        console.warn(`[gemini] ${model} ${e.status === 429 ? "429 quota/rate limit" : "503 overloaded"}; skipping it for ${formatMs(wait)}`);
        lastError = e;
        continue;
      }
      throw e;
    }
  }

  const soonest = Math.min(...MODELS.map((m) => blockedUntil.get(m) ?? 0));
  if (soonest > Date.now()) throw new QuotaExhausted(soonest - Date.now());
  throw lastError ?? new Error("no Gemini models configured");
}

/** Accepts raw base64 or a `data:image/...;base64,` URL; returns raw base64 or null if unusable. */
export function normalizeFrame(input: unknown): string | null {
  if (typeof input !== "string" || input.length === 0) return null;
  const comma = input.indexOf(",");
  const b64 = input.startsWith("data:") && comma !== -1 ? input.slice(comma + 1) : input;
  return b64.length > 0 && b64.length <= MAX_FRAME_CHARS ? b64 : null;
}

export const clampStr = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** One-line error description for logs (Gemini errors embed a huge JSON blob). */
export function shortError(e: unknown) {
  if (e instanceof QuotaExhausted) return e.message;
  if (e instanceof ApiError) return `${e.status} ${e.message.slice(0, 120)}`;
  return e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
}
