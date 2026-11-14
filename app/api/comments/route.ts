import { Type } from "@google/genai";
import { clampStr, generateWithFallback, normalizeFrame, QuotaExhausted, shortError, thinkingConfig } from "@/lib/fitcheck/gemini";
import { SYSTEM_PROMPT } from "@/lib/fitcheck/prompt";
import type { CommentsRequest, CommentsResponse, CommentTag, Tone } from "@/lib/fitcheck/types";

export const runtime = "nodejs";

const TIMEOUT_MS = 8000;
const TONES: readonly Tone[] = ["hype", "roast", "question", "emoji"];
const TAGS: readonly CommentTag[] = ["Outerwear", "Tops", "Bottoms", "Footwear", "Accessories", "Vibe"];

const EMPTY: CommentsResponse = { person_visible: false, comments: [] };

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
          tag: { type: Type.STRING, enum: [...TAGS] },
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
  const b64 = normalizeFrame(frame);
  if (!b64) return null;
  const recentList = Array.isArray(recent)
    ? recent.filter((r): r is string => typeof r === "string").slice(-20).map((r) => r.slice(0, 200))
    : [];
  return { frame: b64, recent: recentList };
}

/** Never trust model output blindly: clamp and filter before it reaches the UI. */
function sanitize(raw: unknown): CommentsResponse {
  if (!raw || typeof raw !== "object") return EMPTY;
  const o = raw as Record<string, unknown>;
  const comments = Array.isArray(o.comments)
    ? o.comments
        .map((c) => {
          const cc = (c ?? {}) as Record<string, unknown>;
          const tone = TONES.includes(cc.tone as Tone) ? (cc.tone as Tone) : "hype";
          const tag = TAGS.includes(cc.tag as CommentTag) ? (cc.tag as CommentTag) : undefined;
          return { text: clampStr(cc.text, 150), tone, ...(tag ? { tag } : {}) };
        })
        .filter((c) => c.text.length > 0)
        .slice(0, 15)
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
  const input = parseBody(await req.json().catch(() => null));
  if (!input) return Response.json({ error: "Expected { frame: base64 jpeg, recent?: string[] }" }, { status: 400 });

  const started = Date.now();
  try {
    const { res, model } = await generateWithFallback({
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
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
        ...thinkingConfig,
      },
    });

    const out = sanitize(JSON.parse(res.text ?? "{}"));
    console.log(`[api/comments] ${model} ${Date.now() - started}ms visible=${out.person_visible} n=${out.comments.length} rating=${out.rating ?? "-"}`);
    return Response.json(out);
  } catch (e) {
    // Rate limits, safety blocks, timeouts, bad JSON: the client falls back to local filler.
    console.warn(`[api/comments] failed after ${Date.now() - started}ms: ${shortError(e)}`);
    if (e instanceof QuotaExhausted) return Response.json({ ...EMPTY, retryAfterMs: e.retryAfterMs });
    return Response.json(EMPTY);
  }
}
