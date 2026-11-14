import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clipParts } from '../lib/fitcheck/clipInput';
import { ApiError } from '../lib/fitcheck/validation';

const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]).toString('base64');
const clip = { video: { mimeType: 'video/webm', data: webm }, durationMs: 2500 };

test('rolling clip windows become chronological video inputs, not isolated JPEG calls', () => {
  const parts = clipParts({ clips: [clip, clip] });
  assert.equal(parts.length, 4);
  assert.equal(parts[1].inlineData?.mimeType, 'video/webm');
  assert.equal(parts[1].videoMetadata?.fps, 2);
  assert.match(parts[2].text!, /clip 2 of 2/);
});

test('invalid video MIME, signatures, duration, and unbounded windows are rejected', () => {
  for (const body of [
    { clip: { ...clip, video: { ...clip.video, mimeType: 'image/jpeg' } } },
    { clip: { ...clip, video: { ...clip.video, data: Buffer.from('not a video').toString('base64') } } },
    { clip: { ...clip, durationMs: 30_000 } }, { clips: [clip, clip, clip] },
  ]) assert.throws(() => clipParts(body), ApiError);
});

test('older browsers send ordered multi-frame sequences with timestamps', () => {
  const frames = [{ frame: '/9j/AA==', offsetMs: 0 }, { frame: '/9j/AA==', offsetMs: 1500 }];
  const parts = clipParts({ clip: { frames, durationMs: 2500 } });
  assert.equal(parts.filter(p => p.inlineData?.mimeType === 'image/jpeg').length, 2);
  assert.match(parts[2].text!, /1.50 seconds/);
  assert.throws(() => clipParts({ clip: { frames: [...frames].reverse(), durationMs: 2500 } }), ApiError);
});
