import { GoogleGenAI, ThinkingLevel, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { ApiError } from "./validation";
import { requestBudget } from './requestBudget';

export function gemini() {
  if (!process.env.GEMINI_API_KEY) throw new ApiError("AI styling is not configured yet. Try the demo, or add GEMINI_API_KEY on the server.", 503);
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { retryOptions: { attempts: 1 } } });
}

const cache = new Map<string, { expires: number; promise: Promise<GenerateContentResponse> }>();
export async function generateFitContent(kind: 'live' | 'report', body: Record<string, unknown> | null, parameters: GenerateContentParameters) {
  const ai = gemini(); // Missing configuration never consumes a request slot.
  const id = (value: unknown, fallback: string) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[a-z0-9_-]{16,80}$/i.test(value)) throw new ApiError('Invalid fit-check session or request identifier.');
    return value;
  };
  const sessionId = id(body?.sessionId, 'legacy-diagnostic-session');
  const requestId = id(body?.requestId, crypto.randomUUID());
  const key = `${sessionId}:${kind}:${requestId}`;
  const now = Date.now();
  for (const [k, entry] of cache) if (entry.expires <= now) cache.delete(k);
  const existing = cache.get(key);
  if (existing) return existing.promise;
  const budget = requestBudget();
  budget.acquire(sessionId, kind, requestId, parameters.model);
  const promise = ai.models.generateContent(parameters).catch(error => {
    try { budget.providerFailed(parameters.model, error); } catch { console.warn('[fitcheck] Could not persist the provider cooldown.'); }
    throw error;
  }).finally(() => {
    try { budget.release(requestId); } catch { console.warn('[fitcheck] Usage slot will expire automatically.'); }
  });
  cache.set(key, { expires: now + 5 * 60_000, promise });
  while (cache.size > 64) cache.delete(cache.keys().next().value!);
  return promise;
}
export const model = () => process.env.GEMINI_MODEL || "gemini-3.5-flash";
export function thinkingConfig() {
  const levels: Record<string, ThinkingLevel> = { minimal: ThinkingLevel.MINIMAL, low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM, high: ThinkingLevel.HIGH };
  const level = levels[(process.env.GEMINI_THINKING ?? "low").toLowerCase()];
  return level ? { thinkingConfig: { thinkingLevel: level } } : {};
}
