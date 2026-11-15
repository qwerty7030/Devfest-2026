import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jpegFrame, readJson, ApiError, MAX_BODY_BYTES } from '../lib/fitcheck/validation';
import { sanitizeAnalysis } from '../lib/fitcheck/analysis';
import { POST as analyze } from '../app/api/fitcheck/analyze/route';
import { POST as comments } from '../app/api/comments/route';

const jpeg = '/9j/AA==';
const request = (body: unknown) => new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ ...(body as object), sessionId: crypto.randomUUID(), requestId: crypto.randomUUID() }) });

test('JPEG parsing supports camera data URLs and rejects arbitrary text, wrong formats and oversized photos', () => {
  assert.equal(jpegFrame(`data:image/jpeg;base64,${jpeg}`), jpeg);
  for (const input of [null, '', 'not an image', 'aGVsbG8=', `data:image/png;base64,${jpeg}`, 'a'.repeat(2_000_001)]) {
    assert.throws(() => jpegFrame(input), ApiError);
  }
});

test('body limit checks actual stream bytes without relying on Content-Length', async () => {
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', body: 'x'.repeat(MAX_BODY_BYTES + 1) })), (e: unknown) => e instanceof ApiError && e.status === 413);
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', body: '{' })), ApiError);
});

test('model output is clamped and limited before reaching results', () => {
  const result = sanitizeAnalysis({ person_visible: true, overallScore: 150, archetype: 'Utility',
    garments: [{ category: 'made-up category', description: 'Jacket', confidence: 4, tagXPercent: -100, tagYPercent: 200 }],
    topComments: [{ username: 'stylist', comment: 'Great jacket', avatarUrl: 'https://untrusted.invalid/tracker' }] });
  assert.ok(result);
  assert.equal(result.overallScore, 100);
  assert.equal(result.garments[0].category, 'Overall Fit');
  assert.equal(result.garments[0].confidence, 1);
  assert.equal(result.garments[0].tagXPercent, 15);
  assert.equal(result.garments[0].tagYPercent, 90);
  assert.equal(result.topComments[0].avatarUrl, '/avatar.svg');
});

test('missing person, invalid score and incomplete analysis never become invented results', () => {
  for (const raw of [null, {}, { person_visible: false }, { person_visible: true, overallScore: '90' },
    { person_visible: true, overallScore: 90, archetype: 'Minimal', garments: [] }]) assert.equal(sanitizeAnalysis(raw), null);
});

test('both routes reject invalid photos with a clear 400', async () => {
  assert.equal((await analyze(request({ snapshotBase64: 'invalid' }))).status, 400);
  assert.equal((await comments(request({ frame: 'invalid' }))).status, 400);
});

test('unconfigured AI is an explicit 503, never a fake successful review', async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const a = await analyze(request({ snapshotBase64: jpeg }));
    const c = await comments(request({ frame: jpeg, recent: [] }));
    assert.equal(a.status, 503); assert.equal(c.status, 503);
    assert.match((await a.json()).error, /not configured/);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous;
  }
});

test('one final request combines three photos, accepts partial framing, and blends both scores', async () => {
  const originalFetch = globalThis.fetch;
  const key = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'unit-test-key';
  let sent = '';
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    sent = String(init?.body);
    return Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({
      person_visible: true, overallScore: 89.7, archetype: 'Relaxed utility', summary: 'Olive layers and balanced proportions.',
      caption: 'My fit, my rules.', garments: [{ category: 'Outerwear', description: 'Olive jacket', color: 'Olive', confidence: .9,
        scoring: { category: 'outerwear', fitQuality: .9, drapeHarmony: .9, points: 2, hierarchy: 'high', colorFamily: 'olive', visualWeight: 'medium' } }],
      topComments: [{ username: 'style.editor', comment: 'The layering works.' }],
    }) }] }, finishReason: 'STOP' }] });
  };
  try {
    const response = await analyze(request({ snapshotsBase64: [jpeg, jpeg, jpeg] }));
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.equal(data.aiScore, 90);
    assert.equal(data.overallScore, Math.round((data.aiScore + data.rulesScore) / 2 * 10) / 10);
    assert.equal(data.source, 'ai');
    assert.equal(data.garments[0].description, 'Olive jacket');
    assert.match(sent, /\/9j\/AA==/);
    assert.match(sent, /do not require a face, full body, shoes, or multiple garments/);
    assert.equal(data.garments.length, 1);
    assert.equal(calls, 1);
    assert.equal(JSON.parse(sent).contents[0].parts.filter((p: { inlineData?: unknown }) => p.inlineData).length, 3);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  } finally {
    globalThis.fetch = originalFetch;
    if (key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = key;
  }
});

test('a model response with no visible outfit is a recoverable 422', async () => {
  const originalFetch = globalThis.fetch;
  const key = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'unit-test-key';
  globalThis.fetch = async () => Response.json({ candidates: [{ content: { parts: [{ text: '{"person_visible":false}' }] } }] });
  try { assert.equal((await analyze(request({ snapshotBase64: jpeg }))).status, 422); }
  finally {
    globalThis.fetch = originalFetch;
    if (key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = key;
  }
});
