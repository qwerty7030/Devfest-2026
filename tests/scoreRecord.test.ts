import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreRecord } from '../frontend/src/services/scoreRecord';
import type { FitPost } from '../frontend/src/services/fitFeed';
const post: FitPost = {
  id: 'outfit-123', source: 'ai', overallScore: 81.5, aiScore: 88, rulesScore: 75,
  archetype: 'Tailored', timestamp: 1, summary: 'Private description', caption: 'Private caption',
  likesCount: 0, garments: [], topComments: [], capturedPhotos: ['data:image/jpeg;base64,PRIVATE_PHOTO'], capturedSnapshotUrl: 'PRIVATE_SNAPSHOT',
  rules: { totalScore: .75, fitScore: .9, pointsScore: .78, hierarchyScore: .95, continuityScore: .1, fitGateMultiplier: .93, totalPoints: 6, notes: ['Strong fit'] },
};
test('Firestore receives only score fields, never images, captions, final-report reactions or garment descriptions', () => {
  const record = scoreRecord(post), json = JSON.stringify(record);
  assert.equal(record.overallScore, 81.5); assert.equal(record.aiScore, 88); assert.equal(record.rulesScore, 75);
  assert.deepEqual(record.rules, post.rules); assert.equal(record.version, 1);
  for (const value of ['PRIVATE', 'capturedPhotos', 'capturedSnapshotUrl', 'garments', 'caption', 'summary', 'topComments']) assert.ok(!json.includes(value));
});
test('optional scores are omitted instead of undefined Firestore values and rule fields are allowlisted', () => {
  const record = scoreRecord({ ...post, aiScore: undefined, rulesScore: undefined,
    rules: { ...post.rules!, notes: ['x'.repeat(500)], ...({ photo: 'PRIVATE_PHOTO' } as object) } });
  assert.ok(!('aiScore' in record)); assert.ok(!('rulesScore' in record));
  assert.equal(record.rules!.notes[0].length, 220); assert.ok(!JSON.stringify(record).includes('PRIVATE'));
});
test('selected live comments and suggestions survive score persistence without copying photo data', () => {
  const streamComments = [{ text: 'The navy sleeves could use a cuff.', feedbackType: 'suggestion' as const, suggestion: 'Roll each cuff once.' }];
  assert.deepEqual(scoreRecord({ ...post, streamComments }).streamComments, streamComments);
  assert.equal(scoreRecord({ ...post, streamComments: Array(10).fill(streamComments[0]) }).streamComments!.length, 6);
});
