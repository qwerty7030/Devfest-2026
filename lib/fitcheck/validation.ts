import { quotaFailure } from './quota';

export const MAX_BODY_BYTES = 3_000_000;

export class ApiError extends Error {
  constructor(message: string, public status = 400, public code?: string, public retryAfterSeconds?: number) { super(message); }
}

/** Bound the stream itself; Content-Length is optional and untrusted. */
export async function readJson(req: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError("A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ApiError("Camera input is too large. Please try again.", 413);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("The request must contain valid JSON.");
  } finally { reader.releaseLock(); }
}

export function jpegFrame(value: unknown): string {
  if (typeof value !== "string") throw new ApiError("A JPEG photo is required.");
  const frame = value.replace(/^data:image\/jpeg;base64,/, "");
  if (frame.length < 8 || frame.length > 2_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(frame)) {
    throw new ApiError("Please send a JPEG photo under 1.5 MB.");
  }
  const bytes = Buffer.from(frame, "base64");
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new ApiError("The photo must be a JPEG.");
  return frame;
}

export function apiFailure(e: unknown) {
  if (e instanceof ApiError) return Response.json({ error: e.message, code: e.code, retryAfterSeconds: e.retryAfterSeconds }, { status: e.status,
    headers: e.retryAfterSeconds ? { 'Retry-After': String(e.retryAfterSeconds) } : undefined });
  const quota = quotaFailure(e);
  if (quota) {
    return Response.json({ error: quota.message, code: quota.code, retryAfterSeconds: quota.retryAfterSeconds }, { status: 429, headers: { 'Retry-After': String(quota.retryAfterSeconds) } });
  }
  console.warn("[fitcheck] AI request failed:", e instanceof Error ? e.name : "Unknown error");
  return Response.json({ error: "The stylist is unavailable right now. Please try again." }, { status: 503 });
}
