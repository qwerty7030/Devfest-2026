import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeComments } from '../lib/fitcheck/comments';
import { POST } from '../app/api/comments/route';

const observation = { id: 'tee', category: 'Tops', description: 'Navy T-shirt with long sleeves' };
const praise = { text: 'The navy tee keeps the color palette clean.', tone: 'hype', evidenceIds: ['tee'], suggestion: '' };
const critique = { text: 'Those navy sleeves look a little bunched.', tone: 'critique', evidenceIds: ['tee'], suggestion: 'Try rolling the cuffs once.' };

test('feedback must reference a valid observed garment and criticism must offer a concrete change', () => {
  const data = sanitizeComments({ person_visible: true, observations: [observation], comments: [
    { ...praise, evidenceIds: [] }, { ...praise, evidenceIds: ['shoes'] }, { ...critique, suggestion: '' }, critique, praise,
  ] });
  assert.equal(data.comments.length, 2);
  assert.equal(data.comments[0].tone, 'hype');
  assert.equal(data.comments[1].tone, 'critique');
  assert.equal(data.comments[1].suggestion, critique.suggestion);
});

test('no wearer or no visible clothing means no observations and no comments', () => {
  assert.deepEqual(sanitizeComments({ person_visible: false, observations: [observation], comments: [praise] }), { person_visible: false, observations: [], comments: [] });
  assert.equal(sanitizeComments({ person_visible: true, observations: [], comments: [praise] }).comments.length, 0);
});

test('the comments route sends the actual camera JPEG and asks Gemini for observed pieces and constructive critique', async () => {
  const key = process.env.GEMINI_API_KEY; const original = globalThis.fetch;
  process.env.GEMINI_API_KEY = 'unit-test-key'; let sent = '';
  globalThis.fetch = async (_url, init) => {
    sent = String(init?.body);
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ person_visible: true, observations: [observation], comments: [praise, critique] }) }] } }] });
  };
  try {
    const result = await POST(new Request('http://localhost/api/comments', { method: 'POST', body: JSON.stringify({ frame: '/9j/AA==', recent: [] }) }));
    assert.equal(result.status, 200);
    const data = await result.json(); assert.equal(data.comments.length, 2); assert.equal(data.observations[0].description, observation.description);
    assert.match(sent, /\/9j\/AA==/); assert.match(sent, /Observe first/); assert.match(sent, /practical change/);
  } finally { globalThis.fetch = original; if (key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = key; }
});
