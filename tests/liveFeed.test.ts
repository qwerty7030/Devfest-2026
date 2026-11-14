import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startLiveFeed } from '../frontend/src/services/apiProvider';
import type { OutfitClipSource } from '../frontend/src/services/clipCapture';
import type { LiveComment } from '../frontend/src/types/fitCheck';
import type { OutfitClip, OutfitObservation } from '../lib/fitcheck/types';

const flush = () => new Promise<void>(resolve => setImmediate(resolve));
const clip = (id = 'a'): OutfitClip => ({ video: { data: id, mimeType: 'video/webm' }, durationMs: 2500 });
const observation = { id: 'jacket', category: 'Outerwear', description: 'Olive green work jacket' };
const praise = { text: 'The olive jacket adds a strong earthy layer.', tone: 'hype', evidenceIds: ['jacket'], suggestion: '', aspect: 'color' };
const critique = { text: 'The long jacket cuffs hide the sleeve shape.', tone: 'critique', evidenceIds: ['jacket'], suggestion: 'Try one small cuff roll.', aspect: 'fit' };
const response = (comments = [praise, critique]) => Response.json({ person_visible: true, observations: [observation], comments });
function manualSource() {
  let emit: (clip: OutfitClip) => void = () => {};
  let stopped = false;
  const source: OutfitClipSource = { start(onClip) { emit = onClip; return () => { stopped = true; }; } };
  return { source, send: (c = clip()) => emit(c), stopped: () => stopped };
}

test('no request or canned chat until a real short clip is ready', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const original = globalThis.fetch; let requests = 0;
  globalThis.fetch = async () => { requests++; return response(); };
  const input = manualSource(); const comments: LiveComment[] = [];
  const stop = startLiveFeed(input.source, c => comments.push(c), () => {});
  try { t.mock.timers.tick(5000); assert.equal(requests, 0); assert.equal(comments.length, 0); }
  finally { stop(); globalThis.fetch = original; }
});

test('one in-flight request and a bounded rolling window retain the newest two complete clips', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const original = globalThis.fetch; const sent: { clips: OutfitClip[] }[] = [];
  let respond!: (r: Response) => void;
  globalThis.fetch = async (_url, init) => {
    sent.push(JSON.parse(String(init?.body)));
    return new Promise<Response>(resolve => { respond = resolve; });
  };
  const input = manualSource(); const stop = startLiveFeed(input.source, () => {}, () => {});
  try {
    input.send(clip('first')); t.mock.timers.tick(0); assert.equal(sent.length, 1);
    input.send(clip('second')); input.send(clip('third')); input.send(clip('fourth'));
    t.mock.timers.tick(100); assert.equal(sent.length, 1, 'no overlapping model calls');
    respond(response()); await flush(); t.mock.timers.tick(200);
    assert.equal(sent.length, 2);
    assert.deepEqual(sent[1].clips.map(c => c.video?.data), ['third', 'fourth']);
  } finally { stop(); globalThis.fetch = original; }
});

test('grounded praise and useful criticism are delivered live after clip analysis', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const original = globalThis.fetch;
  globalThis.fetch = async () => response();
  const input = manualSource(); const comments: LiveComment[] = []; const inventory: OutfitObservation[][] = [];
  const stop = startLiveFeed(input.source, c => comments.push(c), () => {}, items => inventory.push(items));
  try {
    input.send(); t.mock.timers.tick(0); await flush(); t.mock.timers.tick(2200);
    assert.equal(comments.length, 2);
    assert.equal(comments[0].feedbackType, 'compliment');
    assert.equal(comments[1].suggestion, 'Try one small cuff roll.');
    assert.deepEqual(inventory.at(-1), [observation]);
  } finally { stop(); globalThis.fetch = original; }
});

test('an empty clip stops queued comments without forgetting pieces shown earlier', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const original = globalThis.fetch; let batch = 0;
  globalThis.fetch = async () => batch++ === 0 ? response() : Response.json({ person_visible: false, observations: [], comments: [] });
  const input = manualSource(); const comments: LiveComment[] = []; let visible: OutfitObservation[] = [];
  const stop = startLiveFeed(input.source, c => comments.push(c), () => {}, items => { visible = items; });
  try {
    input.send(); t.mock.timers.tick(0); await flush();
    input.send(clip('empty')); t.mock.timers.tick(200); await flush(); t.mock.timers.tick(2200);
    assert.equal(comments.length, 0); assert.deepEqual(visible, [observation]);
  } finally { stop(); globalThis.fetch = original; }
});

test('cancellation stops camera collection and prevents late requests or comments', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const original = globalThis.fetch; let respond!: (r: Response) => void; let signal: AbortSignal | undefined;
  globalThis.fetch = async (_url, init) => { signal = init?.signal ?? undefined; return new Promise<Response>(resolve => { respond = resolve; }); };
  const input = manualSource(); const comments: LiveComment[] = [];
  const stop = startLiveFeed(input.source, c => comments.push(c), () => {});
  try {
    input.send(); t.mock.timers.tick(0); stop(); assert.equal(signal?.aborted, true); assert.equal(input.stopped(), true);
    respond(response()); await flush(); input.send(); t.mock.timers.tick(5000); assert.equal(comments.length, 0);
  } finally { stop(); globalThis.fetch = original; }
});

test('provider failures show the actual error and never make up outfit feedback', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const original = globalThis.fetch; globalThis.fetch = async () => Response.json({ error: 'AI styling is not configured.' }, { status: 503 });
  const input = manualSource(); const comments: LiveComment[] = []; const statuses: string[] = [];
  const stop = startLiveFeed(input.source, c => comments.push(c), s => statuses.push(s));
  try {
    input.send(); t.mock.timers.tick(0); await flush(); t.mock.timers.tick(2200);
    assert.equal(comments.length, 0); assert.match(statuses.at(-1)!, /not configured/);
  } finally { stop(); globalThis.fetch = original; }
});

test('quota exhaustion pauses capture and stops repeated requests to a blocked model', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const original = globalThis.fetch; let requests = 0;
  globalThis.fetch = async () => { requests++; return Response.json({ error: 'Gemini quota exhausted; analysis is paused.' }, { status: 429 }); };
  const input = manualSource(); const statuses: string[] = [];
  const stop = startLiveFeed(input.source, () => {}, s => statuses.push(s));
  try {
    input.send(); t.mock.timers.tick(0); await flush();
    assert.equal(input.stopped(), true); assert.match(statuses.at(-1)!, /quota exhausted/);
    input.send(); t.mock.timers.tick(60_000); await flush(); assert.equal(requests, 1);
  } finally { stop(); globalThis.fetch = original; }
});
