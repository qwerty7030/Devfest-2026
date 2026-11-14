import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { ApiError } from "./validation";

export function gemini() {
  if (!process.env.GEMINI_API_KEY) throw new ApiError("AI styling is not configured yet. Try the demo, or add GEMINI_API_KEY on the server.", 503);
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}
export const model = () => process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
export function thinkingConfig() {
  const levels: Record<string, ThinkingLevel> = { minimal: ThinkingLevel.MINIMAL, low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM, high: ThinkingLevel.HIGH };
  const level = levels[(process.env.GEMINI_THINKING ?? "low").toLowerCase()];
  return level ? { thinkingConfig: { thinkingLevel: level } } : {};
}
