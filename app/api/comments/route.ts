import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "@/lib/fitcheck/prompt";
import type { CommentsRequest, CommentsResponse, Tone } from "@/lib/fitcheck/types";
import { apiFailure, jpegFrame, readJson, ApiError } from "@/lib/fitcheck/validation";

export const runtime = "nodejs";

// Benchmarked 2026-11-14: 3.5-flash-lite ~1s and reliable; 3.5-flash ~9s;
// 3.8-flash timed out / 503s. Re-run scripts/bench-models.mjs to re-check.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
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
const TIMEOUT_MS = 8000;
const MAX_FRAME_CHARS = 2_000_000; // ~1.5MB JPEG, way more than a 512px frame needs
const TONES: readonly Tone[] = ["hype", "roast", "question", "emoji"];

const EMPTY: CommentsResponse = { person_visible: false, comments: [] };

let ai: GoogleGenAI | null = null;
function client() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set (add it to .env.local)");
  ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    person_visible: { type: Type.BOOLEAN },
    vibe: { type: Type.STRING },
    rating: { type: Type.NUMBER },
    comments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          tone: { type: Type.STRING, enum: [...TONES] },
        },
        required: ["text", "tone"],
      },
    },
  },
  required: ["person_visible", "comments"],
};

function parseBody(body: unknown): CommentsRequest | null {
  if (!body || typeof body !== "object") return null;
  const { frame, recent } = body as Record<string, unknown>;
  if (typeof frame !== "string" || frame.length === 0 || frame.length > MAX_FRAME_CHARS) return null;
  const recentList = Array.isArray(recent)
    ? recent.filter((r): r is string => typeof r === "string").slice(-20).map((r) => r.slice(0, 200))
    : [];
  return { frame, recent: recentList };
}

/** Never trust model output blindly: clamp and filter before it reaches the UI. */
function sanitize(raw: unknown): CommentsResponse {
  if (!raw || typeof raw !== "object") return EMPTY;
  const o = raw as Record<string, unknown>;
  const comments = Array.isArray(o.comments)
    ? o.comments
        .map((c) => {
          const cc = (c ?? {}) as Record<string, unknown>;
          const text = typeof cc.text === "string" ? cc.text.trim().slice(0, 150) : "";
          const tone = TONES.includes(cc.tone as Tone) ? (cc.tone as Tone) : "hype";
          return { text, tone };
        })
        .filter((c) => c.text.length > 0)
        .slice(0, 12)
    : [];
  const rating = typeof o.rating === "number" && Number.isFinite(o.rating)
    ? Math.round(Math.min(10, Math.max(0, o.rating)) * 10) / 10
    : undefined;
  return {
    person_visible: o.person_visible === true,
    vibe: typeof o.vibe === "string" ? o.vibe.slice(0, 40) : undefined,
    rating,
    comments,
  };
}

export async function POST(req: Request) {
  const started = Date.now();
  try {
    const input = parseBody(await readJson(req));
    if (!input) throw new ApiError("Expected { frame: base64 jpeg, recent?: string[] }");
    input.frame = jpegFrame(input.frame);
    if (!process.env.GEMINI_API_KEY) throw new ApiError("AI styling is not configured. Try demo mode.", 503);
    const res = await client().models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: input.frame } },
            {
              text: input.recent.length
                ? `Already shown, don't repeat: ${input.recent.join(" | ")}`
                : "This is the first frame. The person just walked in.",
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 1.0,
        maxOutputTokens: 1200,
        abortSignal: AbortSignal.any([req.signal, AbortSignal.timeout(TIMEOUT_MS)]),
        ...(THINKING ? { thinkingConfig: { thinkingLevel: THINKING } } : {}),
      },
    });

    const out = sanitize(JSON.parse(res.text ?? "{}"));
    console.log(`[api/comments] ${MODEL} ${Date.now() - started}ms visible=${out.person_visible} n=${out.comments.length} rating=${out.rating ?? "-"}`);
    return Response.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // Rate limits, safety blocks, timeouts, bad JSON: the client falls back to local filler.
    console.warn(`[api/comments] failed after ${Date.now() - started}ms:`, e instanceof Error ? e.message : e);
    return apiFailure(e);
  }
}
