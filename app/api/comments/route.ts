import { Type } from '@google/genai';
import { SYSTEM_PROMPT } from '@/lib/fitcheck/prompt';
import { gemini, model, thinkingConfig } from '@/lib/fitcheck/gemini';
import { sanitizeComments } from '@/lib/fitcheck/comments';
import { apiFailure, readJson, ApiError } from '@/lib/fitcheck/validation';
import { clipParts, knownOutfit, MAX_CLIP_BODY_BYTES } from '@/lib/fitcheck/clipInput';

export const runtime = 'nodejs';
export const maxDuration = 20;
const string = { type: Type.STRING };
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    person_visible: { type: Type.BOOLEAN }, vibe: string, rating: { type: Type.NUMBER },
    observations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
      id: string, category: string, description: string,
    }, required: ['id', 'category', 'description'] } },
    comments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
      text: string, tone: { type: Type.STRING, enum: ['hype', 'critique'] },
      aspect: { type: Type.STRING, enum: ['color', 'fit', 'layering', 'detail', 'pairing'] },
      evidenceIds: { type: Type.ARRAY, items: string }, suggestion: string,
    }, required: ['text', 'tone', 'aspect', 'evidenceIds', 'suggestion'] } },
  }, required: ['person_visible', 'observations', 'comments'],
};

export async function POST(req: Request) {
  try {
    const body = await readJson(req, MAX_CLIP_BODY_BYTES) as Record<string, unknown> | null;
    const media = clipParts(body);
    const knownItems = knownOutfit(body?.knownItems);
    const coveredParts = Array.isArray(body?.coveredParts) ? body.coveredParts.slice(0, 10).flatMap(p => p && typeof p.id === 'string' && typeof p.comments === 'number' ? [{ id: p.id.slice(0, 30), comments: Math.min(100, Math.max(0, p.comments)) }] : []) : [];
    const recent = Array.isArray(body?.recent)
      ? body.recent.filter((v): v is string => typeof v === 'string').slice(-20).map(v => v.slice(0, 220)) : [];
    const response = await gemini().models.generateContent({ model: model(), contents: [{ role: 'user', parts: [
      ...media,
      { text: `Watch this short outfit clip as a sequence, combining its clear moments. Identify the important visible pieces across the whole clip, even if no single frame contains the full outfit. Give unique feedback about different parts.\nEarlier confirmed pieces (reuse their ids when the same item reappears; they do not establish current presence): ${JSON.stringify(knownItems)}\nComment coverage so far (prioritize pieces with fewer comments, especially newly revealed shoes, bottoms and accessories): ${JSON.stringify(coveredParts)}${recent.length ? `\nAlready shown; do not repeat or paraphrase these points: ${JSON.stringify(recent)}` : ''}` },
    ] }], config: {
      systemInstruction: SYSTEM_PROMPT, responseMimeType: 'application/json', responseSchema,
      temperature: .7, maxOutputTokens: 2600, ...thinkingConfig(),
      abortSignal: AbortSignal.any([req.signal, AbortSignal.timeout(12_000)]),
    } });
    const output = sanitizeComments(JSON.parse(response.text ?? '{}'));
    if (output.person_visible && output.comments.length === 0) throw new ApiError('The outfit feedback was incomplete. Hold your pose while we try again.', 502);
    return Response.json(output, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return apiFailure(e); }
}
