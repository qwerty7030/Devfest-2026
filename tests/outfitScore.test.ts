import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Category as C, HierarchyZone as H, VisualWeight as W, evaluateOutfit, type Garment } from '../lib/fitcheck/outfitScore';
import { withRuleScore } from '../lib/fitcheck/scoredAnalysis';
import { sanitizeAnalysis } from '../lib/fitcheck/analysis';
const look: Garment[] = [
  { name: 'Blazer', category: C.OUTERWEAR, fitQuality: 1, drapeHarmony: 1, points: 2, hierarchy: H.HIGH, colorFamily: 'camel', visualWeight: W.HEAVY },
  { name: 'Tee', category: C.TOP, fitQuality: 1, drapeHarmony: 1, points: 1, hierarchy: H.LOW, colorFamily: 'white', visualWeight: W.LIGHT },
  { name: 'Trousers', category: C.BOTTOM, fitQuality: 1, drapeHarmony: 1, points: 1, hierarchy: H.MID, colorFamily: 'charcoal', visualWeight: W.MEDIUM },
  { name: 'Loafers', category: C.SHOES, fitQuality: 1, drapeHarmony: 1, points: 1, hierarchy: H.LOW, colorFamily: 'black', visualWeight: W.MEDIUM },
  { name: 'Belt', category: C.BELT, fitQuality: 1, drapeHarmony: 1, points: 1, hierarchy: H.LOW, colorFamily: 'black', visualWeight: W.MEDIUM },
  { name: 'Watch', category: C.ACCESSORY, fitQuality: 1, drapeHarmony: 1, points: 1, hierarchy: H.LOW, colorFamily: 'gold', visualWeight: W.LIGHT },
];
test('the supplied rules preserve the 7-point method, hierarchy, continuity weights and fit gate', () => {
  const b = evaluateOutfit(look);
  assert.equal(b.totalPoints, 7); assert.equal(b.pointsScore, 1); assert.equal(b.hierarchyScore, 1);
  // Best pair .95; the five core slots have a 3/3 weight cluster, weighted .8.
  assert.equal(b.continuityScore, .883); assert.equal(b.fitScore, 1); assert.equal(b.fitGateMultiplier, 1);
  assert.equal(b.totalScore, .985);
  const poor = evaluateOutfit(look.map(g => ({ ...g, fitQuality: .3, drapeHarmony: .3 })));
  assert.ok(poor.totalScore < .4); assert.equal(poor.fitGateMultiplier, .51);
  const weakCore = evaluateOutfit(look.map(g => g.category === C.BOTTOM ? { ...g, fitQuality: .1, drapeHarmony: .1 } : g));
  assert.ok(weakCore.totalScore < .7); assert.match(weakCore.notes.join(), /poor fit/);
});
test('empty, non-finite and invalid feature inputs cannot fabricate a score', () => {
  assert.equal(evaluateOutfit([]).totalScore, 0);
  for (const bad of [NaN, Infinity, -1, 1.1]) assert.throws(() => evaluateOutfit([{ ...look[0], fitQuality: bad }]));
});
test('server computes the 50/50 average on a shared 100-point scale and rejects missing estimates', () => {
  const raw = { person_visible: true, overallScore: 80, archetype: 'Tailored', garments: look.map(g => ({ description: g.name, category: 'Tops', scoring: g })) };
  const report = sanitizeAnalysis(raw)!;
  const blended = withRuleScore(raw, report)!;
  assert.equal(blended.aiScore, 80); assert.equal(blended.rulesScore, 98.5); assert.equal(blended.overallScore, 89.3);
  assert.equal(withRuleScore({ ...raw, garments: [{ description: 'Tee' }] }, report), null);
});
