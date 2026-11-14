import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OutfitSession } from '../frontend/src/services/outfitSession';
import type { CommentsResponse, OutfitObservation, OutfitComment } from '../lib/fitcheck/types';

const top = { id: 'top', category: 'Tops', description: 'Navy T-shirt' };
const shoes = { id: 'shoes', category: 'Footwear', description: 'White trainers' };
const comment = (id: string, text: string, tone: 'hype' | 'critique' = 'hype', aspect: OutfitComment['aspect'] = 'color'): OutfitComment =>
  ({ text, tone, aspect, evidenceIds: [id], suggestion: tone === 'critique' ? 'Try a small cuff roll.' : '' });
const batch = (observations: OutfitObservation[], comments: OutfitComment[]): CommentsResponse => ({ person_visible: true, observations, comments });

test('outfit memory combines a top from an earlier clip with shoes revealed later', () => {
  const session = new OutfitSession();
  session.accept(batch([top], [comment('top', 'The navy top works.')]), 1000);
  session.next(1000);
  session.accept(batch([shoes], [comment('shoes', 'The white trainers add contrast.')]), 3500);
  assert.deepEqual(session.inventory(), [top, shoes]);
  assert.deepEqual(session.context().coveredParts, [{ id: 'top', comments: 1 }, { id: 'shoes', comments: 0 }]);
});

test('newly revealed pieces get feedback before another comment about a covered piece', () => {
  const session = new OutfitSession();
  session.accept(batch([top], [comment('top', 'The navy top works.'), comment('top', 'The sleeve could be cleaner.', 'critique', 'fit')]), 1000);
  session.next(1000);
  session.accept(batch([shoes], [comment('shoes', 'The white trainers add contrast.')]), 2000);
  assert.equal(session.next(2000)?.comment.evidenceIds[0], 'shoes');
  assert.equal(session.next(2000)?.comment.tone, 'critique');
});

test('rephrasing the same point about the same piece does not produce repetitive comments', () => {
  const session = new OutfitSession();
  session.accept(batch([top], [comment('top', 'The navy color works.')]), 1000); session.next(1000);
  session.accept(batch([top], [comment('top', 'That navy shade is working.')]), 2000);
  assert.equal(session.next(2000), null);
  session.accept(batch([top], [comment('top', 'The sleeves could use definition.', 'critique', 'fit')]), 2500);
  assert.equal(session.next(2500)?.comment.tone, 'critique');
});

test('unobserved parts and criticism without a suggested change never enter chat', () => {
  const session = new OutfitSession();
  session.accept(batch([top], [comment('shoes', 'Imagined shoes.'), { ...comment('top', 'Needs a change.', 'critique'), suggestion: '' }]), 1000);
  assert.equal(session.next(1000), null);
});
