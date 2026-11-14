import { Type } from "@google/genai";
import { clampStr, generateWithFallback, normalizeFrame, QuotaExhausted, shortError, thinkingConfig } from "@/lib/fitcheck/gemini";

export const runtime = "nodejs";

/**
 * POST /api/analyze — the end-of-stream fit breakdown for the results card.
 * Response shape matches FitResult in frontend/src/types/fitCheck.ts (minus
 * timestamp / capturedSnapshotUrl, which the frontend fills in).
 */

const TIMEOUT_MS = 10000;
const CATEGORIES = ["Outerwear", "Tops", "Bottoms", "Footwear", "Accessories", "Overall Fit"] as const;
type Category = (typeof CATEGORIES)[number];

const SYSTEM_PROMPT = `You are the judge at the end of a fit-check livestream. You get one photo of a person's outfit and a few comments the live audience left.

Return:
- overallScore: integer 0-100 for the whole outfit. Be generous but honest: most decent fits land 70-92, reserve 95+ for standouts.
- archetype: a 2-4 word style label, like "Neo-Streetwear Minimalist" or "Quiet Luxury Commuter".
- summary: 1-2 sentences on what works and one thing that could level it up. Hype-y but specific.
- garments: every clearly visible clothing item or accessory (2-6 items). For each: category, a short specific description ("Boxy Cropped Canvas Work Jacket"), a color name ("Washed Olive"), confidence 0-1 that you identified it correctly, and an optional short highlight (one punchy phrase about why it works).
- topComments: exactly 3 standout audience-style comments about the outfit, each with a made-up social media username (lowercase, underscores or dots). If audience comments are provided, you may pick the best ones; otherwise write new ones in the same casual voice.

Comment ONLY on clothing, accessories, and styling. Never comment on the person's body, weight, face, skin, race, age, gender, or attractiveness. Only describe items you can actually see.`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.INTEGER },
    archetype: { type: Type.STRING },
    summary: { type: Type.STRING },
    garments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: [...CATEGORIES] },
          description: { type: Type.STRING },
          color: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          highlight: { type: Type.STRING },
        },
        required: ["category", "description", "color", "confidence"],
      },
    },
    topComments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          username: { type: Type.STRING },
          comment: { type: Type.STRING },
        },
        required: ["username", "comment"],
      },
    },
  },
  required: ["overallScore", "archetype", "summary", "garments", "topComments"],
};

function sanitize(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const score = typeof o.overallScore === "number" && Number.isFinite(o.overallScore)
    ? Math.round(Math.min(100, Math.max(0, o.overallScore)))
    : null;
  const garments = Array.isArray(o.garments)
    ? o.garments
        .map((g) => {
          const gg = (g ?? {}) as Record<string, unknown>;
          const category: Category = CATEGORIES.includes(gg.category as Category) ? (gg.category as Category) : "Overall Fit";
          const confidence = typeof gg.confidence === "number" && Number.isFinite(gg.confidence)
            ? Math.round(Math.min(1, Math.max(0, gg.confidence)) * 100) / 100
            : 0.8;
          const highlight = clampStr(gg.highlight, 80);
          return {
            category,
            description: clampStr(gg.description, 60),
            color: clampStr(gg.color, 30),
            confidence,
            ...(highlight ? { highlight } : {}),
          };
        })
        .filter((g) => g.description.length > 0)
        .slice(0, 6)
    : [];
  const topComments = Array.isArray(o.topComments)
    ? o.topComments
        .map((c) => {
          const cc = (c ?? {}) as Record<string, unknown>;
          return { username: clampStr(cc.username, 30).replace(/\s+/g, "_") || "fitcheck_fan", comment: clampStr(cc.comment, 150) };
        })
        .filter((c) => c.comment.length > 0)
        .slice(0, 3)
    : [];
  const archetype = clampStr(o.archetype, 40);
  if (score === null || !archetype || garments.length === 0) return null;
  return { overallScore: score, archetype, summary: clampStr(o.summary, 300), garments, topComments };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const frame = normalizeFrame(body?.snapshotBase64);
  if (!frame) {
    return Response.json({ status: "error", error: "Expected { snapshotBase64: jpeg base64 or data URL }" }, { status: 400 });
  }
  const recent = Array.isArray(body?.recentComments)
    ? body.recentComments.filter((r): r is string => typeof r === "string").slice(-15).map((r) => r.slice(0, 150))
    : [];

  const started = Date.now();
  try {
    const { res, model } = await generateWithFallback({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: frame } },
            { text: recent.length ? `Audience comments from the stream:\n${recent.map((c) => `- ${c}`).join("\n")}` : "No audience comments available." },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.7,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
        ...thinkingConfig,
      },
    });

    const data = sanitize(JSON.parse(res.text ?? "{}"));
    if (!data) throw new Error("model returned an unusable result");
    console.log(`[api/analyze] ${model} ${Date.now() - started}ms score=${data.overallScore} "${data.archetype}" garments=${data.garments.length}`);
    return Response.json({ status: "success", data });
  } catch (e) {
    // The frontend falls back to its mock result, so the results screen still shows.
    console.warn(`[api/analyze] failed after ${Date.now() - started}ms: ${shortError(e)}`);
    if (e instanceof QuotaExhausted) return Response.json({ status: "error", retryAfterMs: e.retryAfterMs });
    return Response.json({ status: "error" });
  }
}
