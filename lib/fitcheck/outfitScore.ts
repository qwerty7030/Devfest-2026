export enum Category {
  TOP = 'top', BOTTOM = 'bottom', OUTERWEAR = 'outerwear', DRESS = 'dress',
  SHOES = 'shoes', BELT = 'belt', BAG = 'bag', ACCESSORY = 'accessory',
}
export enum HierarchyZone { HIGH = 'high', MID = 'mid', LOW = 'low' }
export enum VisualWeight { LIGHT = 'light', MEDIUM = 'medium', HEAVY = 'heavy' }
const FIT_IMPORTANCE: Record<Category, number> = {
  dress: 1, top: .95, bottom: .95, outerwear: .9, shoes: .65, belt: .3, bag: .25, accessory: .2,
};
const CORE_FIT_CATEGORIES = new Set([Category.DRESS, Category.TOP, Category.BOTTOM, Category.OUTERWEAR]);
const COHESIVE_PAIR_PRIORITY: ReadonlyArray<readonly [Category, Category, number]> = [
  [Category.OUTERWEAR, Category.BOTTOM, 1], [Category.TOP, Category.BOTTOM, .95],
  [Category.SHOES, Category.BELT, .95], [Category.SHOES, Category.BAG, .95],
  [Category.OUTERWEAR, Category.SHOES, .85], [Category.TOP, Category.SHOES, .8],
];
export interface Garment {
  readonly name: string; readonly category: Category;
  readonly fitQuality: number; readonly drapeHarmony: number; readonly points: 1 | 2;
  readonly hierarchy: HierarchyZone; readonly colorFamily: string; readonly visualWeight: VisualWeight;
}
export interface OutfitScoreBreakdown {
  readonly totalScore: number; readonly fitScore: number; readonly pointsScore: number;
  readonly hierarchyScore: number; readonly continuityScore: number; readonly fitGateMultiplier: number;
  readonly totalPoints: number; readonly notes: string[];
}
export function formatOutfitBreakdown(b: OutfitScoreBreakdown): string {
  return [`Outfit Score: ${b.totalScore.toFixed(3)}`,
    `  Fit & Natural Drape : ${b.fitScore.toFixed(3)} (gate x${b.fitGateMultiplier.toFixed(3)})`,
    `  7-8 Point Method    : ${b.pointsScore.toFixed(3)} (${b.totalPoints} pts)`,
    `  High/Mid/Low Balance: ${b.hierarchyScore.toFixed(3)}`,
    `  2-of-3 Continuity   : ${b.continuityScore.toFixed(3)}`,
    `  Notes: ${b.notes.length ? b.notes.join('; ') : 'Balanced across all rules.'}`].join('\n');
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;
function roundHalfToEven(value: number) {
  const floor = Math.floor(value), diff = value - floor;
  return Math.abs(diff - .5) < 1e-12 ? floor % 2 === 0 ? floor : floor + 1 : Math.round(value);
}
function validateGarment(g: Garment) {
  if (!Number.isFinite(g.fitQuality) || g.fitQuality < 0 || g.fitQuality > 1) throw new Error(`${g.name}: fitQuality must be between 0.0 and 1.0`);
  if (!Number.isFinite(g.drapeHarmony) || g.drapeHarmony < 0 || g.drapeHarmony > 1) throw new Error(`${g.name}: drapeHarmony must be between 0.0 and 1.0`);
  if (g.points !== 1 && g.points !== 2) throw new Error(`${g.name}: points must be 1 (basic) or 2 (statement)`);
  if (!Object.values(Category).includes(g.category) || !Object.values(HierarchyZone).includes(g.hierarchy) || !Object.values(VisualWeight).includes(g.visualWeight)) throw new Error(`${g.name}: invalid garment classification`);
}
function scoreFitAndDrape(garments: readonly Garment[], notes: string[]) {
  let sum = 0, weights = 0;
  const core: number[] = [];
  for (const g of garments) {
    const fit = .7 * g.fitQuality + .3 * g.drapeHarmony, w = FIT_IMPORTANCE[g.category];
    sum += fit * w; weights += w;
    if (CORE_FIT_CATEGORIES.has(g.category)) core.push(fit);
  }
  const mean = weights > 0 ? sum / weights : 0, min = core.length ? Math.min(...core) : mean;
  const score = clamp01(.7 * mean + .3 * min);
  if (min < .55) notes.push('At least one core garment has poor fit/drape, heavily limiting the look');
  else if (score >= .88) notes.push('Strong natural fit and proportion across garments');
  return score;
}
function scorePointMethod(garments: readonly Garment[], notes: string[]) {
  const totalPoints = garments.reduce((sum, g) => sum + g.points, 0);
  const score = totalPoints >= 7 && totalPoints <= 8 ? 1 : totalPoints === 6 || totalPoints === 9 ? .78
    : totalPoints === 5 || totalPoints === 10 ? .52 : totalPoints < 5 ? clamp01(.52 - .14 * (5 - totalPoints)) : clamp01(.52 - .12 * (totalPoints - 10));
  if (totalPoints < 5) notes.push(`Under-styled (${totalPoints} pts < 5): outfit reads too plain`);
  else if (totalPoints > 10) notes.push(`Over-styled (${totalPoints} pts > 10): too chaotic and noisy`);
  return { score, totalPoints };
}
function scoreVisualHierarchy(garments: readonly Garment[], notes: string[]) {
  const highs = garments.filter(g => g.hierarchy === HierarchyZone.HIGH).length;
  const mids = garments.filter(g => g.hierarchy === HierarchyZone.MID).length;
  const lows = garments.filter(g => g.hierarchy === HierarchyZone.LOW).length;
  let highScore: number;
  if (highs === 1) highScore = 1;
  else if (highs === 0) { highScore = .35; notes.push('No HIGH focal piece: outfit lacks a clear anchor'); }
  else if (highs === 2) { highScore = .6; notes.push('2 HIGH pieces compete for attention'); }
  else { highScore = clamp01(.4 - .1 * (highs - 3)); notes.push(`${highs} HIGH pieces create visual competition`); }
  const midScore = mids >= 1 && mids <= 2 ? 1 : mids === 0 ? .55 : mids === 3 ? .8 : .6;
  if (!lows) notes.push('No LOW grounding pieces: eye has nowhere to rest');
  return clamp01(.45 * highScore + .25 * midScore + .3 * (lows ? 1 : .4));
}
function scoreTwoOfThreeRule(garments: readonly Garment[], notes: string[]) {
  const byCat = new Map<Category, Garment[]>();
  for (const g of garments) byCat.set(g.category, [...(byCat.get(g.category) ?? []), g]);
  let bestPairScore = 0;
  for (const [a, b, priority] of COHESIVE_PAIR_PRIORITY) for (const x of byCat.get(a) ?? []) for (const y of byCat.get(b) ?? []) {
    const color = x.colorFamily.toLowerCase() === y.colorFamily.toLowerCase(), weight = x.visualWeight === y.visualWeight;
    bestPairScore = Math.max(bestPairScore, (color && weight ? 1 : color ? .9 : weight ? .7 : 0) * priority);
  }
  const slots = [Category.OUTERWEAR, Category.TOP, Category.DRESS, Category.BOTTOM, Category.SHOES, Category.BAG, Category.BELT];
  const core = slots.flatMap(c => byCat.get(c) ?? []);
  if (core.length < 2) return .5;
  const colors = new Map<string, number>(), weights = new Map<VisualWeight, number>();
  for (const g of core) { const c = g.colorFamily.toLowerCase(); colors.set(c, (colors.get(c) ?? 0) + 1); weights.set(g.visualWeight, (weights.get(g.visualWeight) ?? 0) + 1); }
  const maxColor = Math.max(...colors.values()), maxWeight = Math.max(...weights.values());
  const target = Math.max(2, roundHalfToEven(core.length * (2 / 3)));
  const colorRatio = maxColor >= 2 ? Math.min(1, maxColor / target) : .25;
  const weightRatio = maxWeight >= 2 ? Math.min(1, maxWeight / target) : .3;
  const continuity = clamp01(.55 * bestPairScore + .45 * Math.max(colorRatio, .8 * weightRatio));
  if (continuity < .5) notes.push('Weak 2-of-3 cohesion: core items lack shared color family or visual weight');
  return continuity;
}
/** User-supplied rules, including the weakest core-piece penalty and fit gate. */
export function evaluateOutfit(garments: Iterable<Garment>): OutfitScoreBreakdown {
  const items = Array.from(garments);
  if (!items.length) return { totalScore: 0, fitScore: 0, pointsScore: 0, hierarchyScore: 0, continuityScore: 0, fitGateMultiplier: .3, totalPoints: 0, notes: ['No garments provided'] };
  items.forEach(validateGarment);
  const notes: string[] = [], fitScore = scoreFitAndDrape(items, notes);
  const { score: pointsScore, totalPoints } = scorePointMethod(items, notes);
  const hierarchyScore = scoreVisualHierarchy(items, notes), continuityScore = scoreTwoOfThreeRule(items, notes);
  const weighted = .55 * fitScore + .17 * pointsScore + .15 * hierarchyScore + .13 * continuityScore;
  const gate = .3 + .7 * fitScore;
  return { totalScore: round3(clamp01(weighted * gate)), fitScore: round3(fitScore), pointsScore: round3(pointsScore), hierarchyScore: round3(hierarchyScore), continuityScore: round3(continuityScore), fitGateMultiplier: round3(gate), totalPoints, notes };
}
