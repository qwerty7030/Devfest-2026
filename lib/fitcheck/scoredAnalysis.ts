import { Category, HierarchyZone, VisualWeight, evaluateOutfit, type Garment } from './outfitScore';
import type { FitResult } from '@/frontend/src/types/fitCheck';

/** Feature estimates come from Gemini; the arithmetic and final blend run here. */
export function withRuleScore(raw: Record<string, unknown>, analysis: Omit<FitResult, 'capturedPhotos' | 'timestamp'>) {
  if (!Array.isArray(raw.garments) || raw.garments.length !== analysis.garments.length) return null;
  const items: Garment[] = [];
  for (const garment of raw.garments) {
    const s = garment?.scoring;
    if (!s || !Object.values(Category).includes(s.category) || !Object.values(HierarchyZone).includes(s.hierarchy)
      || !Object.values(VisualWeight).includes(s.visualWeight) || typeof s.colorFamily !== 'string' || !s.colorFamily.trim()
      || !Number.isFinite(s.fitQuality) || !Number.isFinite(s.drapeHarmony) || ![1, 2].includes(s.points)) return null;
    items.push({ name: garment.description, category: s.category, fitQuality: s.fitQuality, drapeHarmony: s.drapeHarmony,
      points: s.points, hierarchy: s.hierarchy, visualWeight: s.visualWeight, colorFamily: s.colorFamily.trim().toLowerCase().slice(0, 50) });
  }
  try {
    const rules = evaluateOutfit(items);
    const aiScore = analysis.overallScore, rulesScore = Math.round(rules.totalScore * 1000) / 10;
    return { ...analysis, aiScore, rulesScore, rules, scoringGarments: items,
      overallScore: Math.round(((aiScore + rulesScore) / 2) * 10) / 10 };
  } catch { return null; }
}
