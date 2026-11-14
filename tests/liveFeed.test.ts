import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startLiveFeed } from '../frontend/src/services/apiProvider';
import type { LiveComment } from '../frontend/src/types/fitCheck';
import type { OutfitObservation } from '../lib/fitcheck/types';

const flush = () => new Promise<void>(resolve => setImmediate(resolve));
const observation = { id: 'jacket', category: 'Outerwear', description: 'Olive green work jacket' };
const praise = { text: 'The olive jacket adds a strong earthy layer.', tone: 'hype', evidenceIds: ['jacket'], suggestion: '' };
const critique = { text: 'The long jacket cuffs hide the sleeve shape.', tone: 'critique', evidenceIds: ['jacket'], suggestion: 'Try one small cuff roll.' };
const response = (comments = [praise, critique]) => Response.json({ person_visible: true, observations: [observation], comments });

test('missing API configuration shows the real error and never substitutes canned comments', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: 'AI styling is not configured.' }, { status: 503 });
  const comments: LiveComment[] = []; const statuses: string[] = [];
  const stop = startLiveFeed(() => '/9j/AA==', c => comments.push(c), s => statuses.push(s));
  try {
    await flush(); t.mock.timers.tick(9900);
    assert.equal(comments.length, 0);
    assert.match(statuses.at(-1)!, /API key is missing/);
  } finally { stop(); globalThis.fetch = original; }
});

test('no usable camera frame means no requests and no outfit claims', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const original = globalThis.fetch; let requests = 0;
  globalThis.fetch = async () => { requests++; return response(); };
  const comments: LiveComment[] = [];
  const stop = startLiveFeed(() => null, c => comments.push(c), () => {});
  try { t.mock.timers.tick(2200); assert.equal(comments.length, 0); assert.equal(requests, 0); }
  finally { stop(); globalThis.fetch = original; }
});

test('comments wait for actual outfit observations, then include praise and actionable changes', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const original = globalThis.fetch; let respond!: (r: Response) => void;
  let signal: AbortSignal | undefined;
  globalThis.fetch = async (_url, init) => { signal = init?.signal ?? undefined; return new Promise<Response>(resolve => { respond = resolve; }); };
  const comments: LiveComment[] = []; const observed: OutfitObservation[][] = [];
  const stop = startLiveFeed(() => '/9j/AA==', c => comments.push(c), () => {}, items => observed.push(items));
  try {
    t.mock.timers.tick(2200); assert.equal(comments.length, 0);
    respond(response()); await flush(); t.mock.timers.tick(2200);
    assert.equal(comments.length, 2);
    assert.equal(comments[0].feedbackType, 'compliment');
    assert.equal(comments[1].feedbackType, 'suggestion');
    assert.equal(comments[1].suggestion, 'Try one small cuff roll.');
    assert.equal(comments[0].tag, observation.description);
    assert.deepEqual(observed.at(-1), [observation]);
    stop(); assert.equal(signal?.aborted, true);
  } finally { stop(); globalThis.fetch = original; }
});

test('no wearer clears pending outfit feedback instead of commenting on an empty room', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const original = globalThis.fetch; let batch = 0;
  globalThis.fetch = async () => batch++ === 0 ? response(Array.from({length: 6}, (_, i) => ({ ...praise, text: `Olive jacket detail ${i}` })))
    : Response.json({ person_visible: false, observations: [], comments: [] });
  const comments: LiveComment[] = []; let visible: OutfitObservation[] = [];
  const stop = startLiveFeed(() => '/9j/AA==', c => comments.push(c), () => {}, items => { visible = items; });
  try {
    await flush(); t.mock.timers.tick(3000); await flush();
    const count = comments.length; assert.equal(count, 2); assert.deepEqual(visible, []);
    t.mock.timers.tick(2200); assert.equal(comments.length, count);
  } finally { stop(); globalThis.fetch = original; }
});

test('ungrounded feedback and criticism without an actionable change are not displayed', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const original = globalThis.fetch;
  globalThis.fetch = async () => response([{ ...praise, evidenceIds: ['invisible-shoes'] }, { ...critique, suggestion: '' }]);
  const comments: LiveComment[] = [];
  const stop = startLiveFeed(() => '/9j/AA==', c => comments.push(c), () => {});
  try { await flush(); t.mock.timers.tick(2200); assert.equal(comments.length, 0); }
  finally { stop(); globalThis.fetch = original; }
});

test('a canceled request cannot publish comments or change detected clothing later', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const original = globalThis.fetch; let respond!: (r: Response) => void;
  globalThis.fetch = async () => new Promise<Response>(resolve => { respond = resolve; });
  const comments: LiveComment[] = []; const observed: OutfitObservation[][] = [];
  const stop = startLiveFeed(() => '/9j/AA==', c => comments.push(c), () => {}, items => observed.push(items));
  try {
    stop(); respond(response()); await flush(); t.mock.timers.tick(5000);
    assert.equal(comments.length, 0); assert.deepEqual(observed, [[]]);
  } finally { stop(); globalThis.fetch = original; }
});
