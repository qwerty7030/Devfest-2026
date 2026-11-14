import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startLiveFeed } from '../frontend/src/services/apiProvider';
import type { LiveComment } from '../frontend/src/types/fitCheck';

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

test('missing API key still produces immediate, clearly labeled chat and stops cleanly', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: 'AI styling is not configured. Try demo mode.' }, { status: 503 });
  const comments: LiveComment[] = [];
  const statuses: string[] = [];
  const stop = startLiveFeed(() => 'data:image/jpeg;base64,/9j/AA==', c => comments.push(c), s => statuses.push(s));
  try {
    assert.equal(comments.length, 1, 'chat appears without waiting for an API response');
    assert.equal(comments[0].badge, 'Simulated');
    await flush();
    assert.match(statuses.at(-1)!, /API key needed/);
    t.mock.timers.tick(1900);
    assert.equal(comments.length, 3);
    assert.ok(comments.every(c => c.badge === 'Simulated'));
    stop();
    t.mock.timers.tick(5000);
    assert.equal(comments.length, 3, 'no delayed chatter after leaving the session');
  } finally { stop(); globalThis.fetch = original; }
});

test('camera startup gaps do not leave chat blank or make invalid API requests', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('must not fetch without a frame'); };
  const comments: LiveComment[] = [];
  const stop = startLiveFeed(() => null, c => comments.push(c), () => {});
  try {
    t.mock.timers.tick(1900);
    assert.equal(comments.length, 3);
    assert.equal(requests, 0);
  } finally { stop(); globalThis.fetch = original; }
});

test('slow AI is bridged by local chat, then AI comments are delivered first', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const original = globalThis.fetch;
  let respond!: (r: Response) => void;
  let signal: AbortSignal | undefined;
  globalThis.fetch = async (_url, init) => {
    signal = init?.signal ?? undefined;
    return new Promise<Response>(resolve => { respond = resolve; });
  };
  const comments: LiveComment[] = [];
  const stop = startLiveFeed(() => '/9j/AA==', c => comments.push(c), () => {});
  try {
    t.mock.timers.tick(1900);
    assert.equal(comments.length, 3);
    respond(Response.json({ person_visible: true, comments: [{ text: 'The olive jacket works', tone: 'hype' }] }));
    await flush();
    t.mock.timers.tick(950);
    assert.equal(comments.at(-1)?.comment, 'The olive jacket works');
    assert.equal(comments.at(-1)?.badge, 'AI audience');
    stop();
    assert.equal(signal?.aborted, true);
  } finally { stop(); globalThis.fetch = original; }
});

test('new AI batches preserve earlier undelivered comments', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const original = globalThis.fetch;
  let batch = 0;
  globalThis.fetch = async () => Response.json({ person_visible: true,
    comments: batch++ === 0 ? Array.from({ length: 8 }, (_, i) => ({ text: `First batch ${i}`, tone: 'hype' }))
      : [{ text: 'Second batch', tone: 'hype' }] });
  const comments: LiveComment[] = [];
  const stop = startLiveFeed(() => '/9j/AA==', c => comments.push(c), () => {});
  try {
    await flush();
    t.mock.timers.tick(4000);
    await flush();
    t.mock.timers.tick(3800);
    const aiComments = comments.filter(c => c.badge === 'AI audience');
    assert.equal(aiComments.length, 8);
    assert.deepEqual(aiComments.map(c => c.comment), Array.from({ length: 8 }, (_, i) => `First batch ${i}`));
  } finally { stop(); globalThis.fetch = original; }
});

test('a canceled request cannot add comments or update status later', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const original = globalThis.fetch;
  let respond!: (r: Response) => void;
  globalThis.fetch = async () => new Promise<Response>(resolve => { respond = resolve; });
  const comments: LiveComment[] = [];
  const statuses: string[] = [];
  const stop = startLiveFeed(() => '/9j/AA==', c => comments.push(c), s => statuses.push(s));
  try {
    stop();
    const statusCount = statuses.length;
    respond(Response.json({ person_visible: true, comments: [{ text: 'Too late', tone: 'hype' }] }));
    await flush();
    t.mock.timers.tick(5000);
    assert.equal(comments.length, 1);
    assert.equal(statuses.length, statusCount);
  } finally { stop(); globalThis.fetch = original; }
});
