import { Type } from '@google/genai';
import { SYSTEM_PROMPT } from '@/lib/fitcheck/prompt';
import { gemini, model, thinkingConfig } from '@/lib/fitcheck/gemini';
import { sanitizeComments } from '@/lib/fitcheck/comments';
import { apiFailure, jpegFrame, readJson, ApiError } from '@/lib/fitcheck/validation';

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
      evidenceIds: { type: Type.ARRAY, items: string }, suggestion: string,
    }, required: ['text', 'tone', 'evidenceIds', 'suggestion'] } },
  }, required: ['person_visible', 'observations', 'comments'],
};

export async function POST(req: Request) {
  try {
    const body = await readJson(req) as Record<string, unknown> | null;
    const frame = jpegFrame(body?.frame);
    const recent = Array.isArray(body?.recent)
      ? body.recent.filter((v): v is string => typeof v === 'string').slice(-20).map(v => v.slice(0, 220)) : [];
    const response = await gemini().models.generateContent({ model: model(), contents: [{ role: 'user', parts: [
      { inlineData: { mimeType: 'image/jpeg', data: frame } },
      { text: `Observe what this person is wearing now. Identify visible pieces, then give specific compliments and constructive changes.${recent.length ? `\nDo not repeat these earlier comments: ${JSON.stringify(recent)}` : ''}` },
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
