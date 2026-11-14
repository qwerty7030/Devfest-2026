import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFitContent } from '../lib/fitcheck/gemini';
import { ApiError, apiFailure } from '../lib/fitcheck/validation';

test('a Google 429 is attempted once, then new sessions are blocked locally with a cooldown', async () => {
  const original = globalThis.fetch; const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'unit-test-key'; let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ error: { code: 429, message: 'RequestsPerMinute exceeded', status: 'RESOURCE_EXHAUSTED', details: [{ retryDelay: '65s' }] } }, { status: 429 }); };
  try {
    const params = { model: 'test-quota-model', contents: 'A mocked request, never sent to Google.' };
    await assert.rejects(generateFitContent('live', { sessionId: crypto.randomUUID(), requestId: crypto.randomUUID() }, params), (e: unknown) => typeof e === 'object' && e !== null && 'status' in e && e.status === 429);
    assert.equal(calls, 1, 'no SDK retry amplification');
    let blocked: unknown;
    try { await generateFitContent('live', { sessionId: crypto.randomUUID(), requestId: crypto.randomUUID() }, params); } catch (e) { blocked = e; }
    assert.ok(blocked instanceof ApiError); assert.equal(blocked.code, 'AI_RATE_LIMITED'); assert.equal(calls, 1);
    const response = apiFailure(blocked); assert.equal(response.status, 429); assert.ok(Number(response.headers.get('Retry-After')) >= 64);
  } finally { globalThis.fetch = original; if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous; }
});
