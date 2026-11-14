import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOutfitClipSource } from '../frontend/src/services/clipCapture';
import type { OutfitClip } from '../lib/fitcheck/types';

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

test('each recorded short clip has its own finalized container and collection stops without stopping the camera', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const original = globalThis.MediaRecorder;
  const recorders: FakeRecorder[] = [];
  class FakeRecorder {
    static isTypeSupported(type: string) { return type.startsWith('video/mp4'); }
    state = 'inactive'; mimeType = 'video/mp4';
    ondataavailable?: (e: { data: Blob }) => void; onstop?: () => void;
    constructor() { recorders.push(this); }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob([new Uint8Array([0, 0, 0, 16, 102, 116, 121, 112, recorders.indexOf(this)])]) });
      this.onstop?.();
    }
  }
  globalThis.MediaRecorder = FakeRecorder as unknown as typeof MediaRecorder;
  let stoppedTracks = 0;
  const video = { readyState: 4, srcObject: { getVideoTracks: () => [{ stop: () => stoppedTracks++ }] } } as unknown as HTMLVideoElement;
  const clips: OutfitClip[] = [];
  const stop = createOutfitClipSource(() => video, () => '/9j/AA==').start(c => clips.push(c), () => {});
  try {
    t.mock.timers.tick(2500); await flush();
    t.mock.timers.tick(2500); await flush();
    assert.equal(clips.length, 2);
    assert.equal(clips[0].video?.mimeType, 'video/mp4');
    for (const c of clips) assert.equal(Buffer.from(c.video!.data, 'base64').subarray(4, 8).toString(), 'ftyp');
    assert.equal(recorders.length, 3, 'next recorder starts while the previous clip is encoded');
    stop(); t.mock.timers.tick(5000); await flush();
    assert.equal(clips.length, 2); assert.equal(stoppedTracks, 0);
  } finally { stop(); globalThis.MediaRecorder = original; }
});

test('unsupported video recording falls back to a short sequence rather than one exact frame', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  const original = globalThis.MediaRecorder;
  globalThis.MediaRecorder = undefined as unknown as typeof MediaRecorder;
  const video = { readyState: 4, srcObject: { getVideoTracks: () => [{}] } } as unknown as HTMLVideoElement;
  const clips: OutfitClip[] = [];
  const stop = createOutfitClipSource(() => video, () => '/9j/AA==').start(c => clips.push(c), () => {});
  try {
    for (let i = 0; i < 5; i++) t.mock.timers.tick(500);
    assert.equal(clips.length, 1);
    assert.equal(clips[0].frames?.length, 6); assert.equal(clips[0].durationMs, 2500);
    assert.deepEqual(clips[0].frames?.map(f => f.offsetMs), [0, 500, 1000, 1500, 2000, 2500]);
    stop(); t.mock.timers.tick(5000); assert.equal(clips.length, 1);
  } finally { stop(); globalThis.MediaRecorder = original; }
});
