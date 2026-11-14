import type { FitResult, GarmentItem } from "@/frontend/src/types/fitCheck";

const categories = ["Outerwear", "Tops", "Bottoms", "Footwear", "Accessories", "Overall Fit"];
const string = (v: unknown, max = 300) => typeof v === "string" ? v.trim().slice(0, max) : "";
const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

export function sanitizeAnalysis(raw: unknown): Omit<FitResult, "capturedPhotos" | "timestamp"> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.person_visible !== true || !Number.isFinite(o.overallScore) || !string(o.archetype)) return null;
  const garments: GarmentItem[] = (Array.isArray(o.garments) ? o.garments : []).slice(0, 8).flatMap(g => {
    if (!g || typeof g !== "object" || !string(g.description)) return [];
    return [{
      category: (categories.includes(g.category) ? g.category : "Overall Fit") as GarmentItem["category"],
      description: string(g.description, 100), color: string(g.color, 60),
      confidence: clamp(g.confidence, 0, 1, 0.5), highlight: string(g.highlight, 120),
      tagXPercent: clamp(g.tagXPercent, 15, 85, 50), tagYPercent: clamp(g.tagYPercent, 15, 90, 50),
    }];
  });
  if (!garments.length) return null;
  const topComments = (Array.isArray(o.topComments) ? o.topComments : []).slice(0, 3).flatMap((c, i) => {
    if (!c || typeof c !== "object" || !string(c.comment)) return [];
    return [{ id: `highlight-${i}`, username: string(c.username, 30) || `style_guest_${i + 1}`,
      comment: string(c.comment, 160), avatarUrl: "/avatar.svg", badge: "AI audience", timeAgo: "Just now", likes: 0 }];
  });
  return { overallScore: Math.round(clamp(o.overallScore, 0, 100, 0)), archetype: string(o.archetype, 60),
    summary: string(o.summary, 600), caption: string(o.caption, 800), likesCount: 0, garments, topComments, source: "ai" };
}
