import "server-only";
import { Type } from "@google/genai";
import { clampStr } from "./gemini";

/**
 * The results-card ("fit") part of a Gemini response, shared by
 * /api/comments (returned with every batch so the card needs no extra call)
 * and /api/analyze (fallback). Shape matches FitResult in
 * frontend/src/types/fitCheck.ts, minus topComments / timestamp / photo.
 */

export const GARMENT_CATEGORIES = ["Outerwear", "Tops", "Bottoms", "Footwear", "Accessories", "Overall Fit"] as const;
export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];

export interface Garment {
  category: GarmentCategory;
  description: string;
  color: string;
  confidence: number;
  highlight?: string;
}

export interface Fit {
  overallScore: number;
  archetype: string;
  summary: string;
  garments: Garment[];
}

/** Prompt text describing the fit fields (keep in sync with fitSchemaProperties). */
export const FIT_INSTRUCTIONS = `- overallScore: integer 0-100 for the whole outfit. Be generous but honest: most decent fits land 70-92, reserve 95+ for standouts.
- archetype: a 2-4 word style label, like "Neo-Streetwear Minimalist" or "Quiet Luxury Commuter".
- summary: 1-2 sentences on what works and one thing that could level it up. Hype-y but specific.
- garments: every clearly visible clothing item or accessory (2-6 items). For each: category, a short specific description ("Boxy Cropped Canvas Work Jacket"), a color name ("Washed Olive"), confidence 0-1 that you identified it correctly, and an optional short highlight (one punchy phrase about why it works).`;

export const garmentSchema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, enum: [...GARMENT_CATEGORIES] },
    description: { type: Type.STRING },
    color: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    highlight: { type: Type.STRING },
  },
  required: ["category", "description", "color", "confidence"],
};

/** The four fit fields, to spread into a response schema's `properties`. */
export const fitSchemaProperties = {
  overallScore: { type: Type.INTEGER },
  archetype: { type: Type.STRING },
  summary: { type: Type.STRING },
  garments: { type: Type.ARRAY, items: garmentSchema },
};

/** Clamp/filter model output. Returns null if there's no usable score, label, or garments. */
export function sanitizeFit(raw: unknown): Fit | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const score = typeof o.overallScore === "number" && Number.isFinite(o.overallScore)
    ? Math.round(Math.min(100, Math.max(0, o.overallScore)))
    : null;
  const garments = Array.isArray(o.garments)
    ? o.garments
        .map((g): Garment => {
          const gg = (g ?? {}) as Record<string, unknown>;
          const category = GARMENT_CATEGORIES.includes(gg.category as GarmentCategory)
            ? (gg.category as GarmentCategory)
            : "Overall Fit";
          const confidence = typeof gg.confidence === "number" && Number.isFinite(gg.confidence)
            ? Math.round(Math.min(1, Math.max(0, gg.confidence)) * 100) / 100
            : 0.8;
          const highlight = clampStr(gg.highlight, 80);
          return {
            category,
            description: clampStr(gg.description, 60),
            color: clampStr(gg.color, 30),
            confidence,
            ...(highlight ? { highlight } : {}),
          };
        })
        .filter((g) => g.description.length > 0)
        .slice(0, 6)
    : [];
  const archetype = clampStr(o.archetype, 40);
  if (score === null || !archetype || garments.length === 0) return null;
  return { overallScore: score, archetype, summary: clampStr(o.summary, 300), garments };
}
