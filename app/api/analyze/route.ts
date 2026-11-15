import { Type } from "@google/genai";
import { clampStr, generateWithFallback, normalizeFrame, QuotaExhausted, rateTag, shortError, thinkingConfig } from "@/lib/fitcheck/gemini";
import { FIT_INSTRUCTIONS, fitSchemaProperties, sanitizeFit } from "@/lib/fitcheck/fitSchema";

export const runtime = "nodejs";

/**
 * POST /api/analyze — fallback for the results card. Normally the card is built
 * from the `fit` returned with /api/comments; this is only called if a session
 * never got a successful comments response.
 * Response shape matches FitResult in frontend/src/types/fitCheck.ts (minus
 * timestamp / capturedSnapshotUrl, which the frontend fills in).
 */

const TIMEOUT_MS = 10000;
const SYSTEM_PROMPT = `You are the judge at the end of a fit-check livestream. You get one photo of a person's outfit and a few comments the live audience left.

Return:
${FIT_INSTRUCTIONS}
- topComments: exactly 3 standout audience-style comments about the outfit, each with a made-up social media username (lowercase, underscores or dots). If audience comments are provided, you may pick the best ones; otherwise write new ones in the same casual voice.

Comment ONLY on clothing, accessories, and styling. Never comment on the person's body, weight, face, skin, race, age, gender, or attractiveness. Only describe items you can actually see.`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    ...fitSchemaProperties,
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
  const fit = sanitizeFit(raw);
  if (!fit) return null;
  const o = raw as Record<string, unknown>;
  const topComments = Array.isArray(o.topComments)
    ? o.topComments
        .map((c) => {
          const cc = (c ?? {}) as Record<string, unknown>;
          return { username: clampStr(cc.username, 30).replace(/\s+/g, "_") || "fitcheck_fan", comment: clampStr(cc.comment, 150) };
        })
        .filter((c) => c.comment.length > 0)
        .slice(0, 3)
    : [];
  return { ...fit, topComments };
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
    console.log(`[api/analyze] ${rateTag()} ${model} ${Date.now() - started}ms score=${data.overallScore} "${data.archetype}" garments=${data.garments.length}`);
    return Response.json({ status: "success", data });
  } catch (e) {
    // The frontend falls back to its mock result, so the results screen still shows.
    console.warn(`[api/analyze] ${rateTag()} failed after ${Date.now() - started}ms: ${shortError(e)}`);
    if (e instanceof QuotaExhausted) return Response.json({ status: "error", retryAfterMs: e.retryAfterMs });
    return Response.json({ status: "error" });
  }
}
