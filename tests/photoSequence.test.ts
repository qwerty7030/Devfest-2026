import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startPhotoSequence } from '../frontend/src/services/photoSequence';
test('all three photos are automatic and each gets a complete 3,2,1 countdown', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const ticks: number[] = [], poses: number[] = [], photos: string[] = [];
  let completed: string[] = [], captures = 0;
  const stop = startPhotoSequence({ capture: () => `photo-${++captures}`, onPose: p => poses.push(p),
    onTick: n => { if (n) ticks.push(n); }, onPhoto: p => photos.push(p), onComplete: p => { completed = p; }, onError: () => assert.fail('unexpected failure') });
  for (let pose = 0; pose < 3; pose++) {
    if (pose) t.mock.timers.tick(600);
    t.mock.timers.tick(1200); assert.equal(captures, pose);
    t.mock.timers.tick(1000); t.mock.timers.tick(1000); assert.equal(captures, pose);
    t.mock.timers.tick(1000); assert.equal(captures, pose + 1);
  }
  t.mock.timers.tick(400);
  assert.deepEqual(ticks, [3, 2, 1, 3, 2, 1, 3, 2, 1]); assert.deepEqual(poses, [0, 1, 2]); assert.deepEqual(completed, photos);
  stop();
});
test('cancelling a countdown prevents captures and late completion', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let captures = 0;
  const stop = startPhotoSequence({ capture: () => { captures++; return 'photo'; }, onPose: () => {}, onTick: () => {}, onPhoto: () => {}, onComplete: () => assert.fail('completed after cancel'), onError: () => {} });
  t.mock.timers.tick(1200); stop(); t.mock.timers.tick(20_000); assert.equal(captures, 0);
});
