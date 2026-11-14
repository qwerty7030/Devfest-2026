// Lists Gemini models your key can call with generateContent.
// Usage: node scripts/list-models.mjs   (reads GEMINI_API_KEY from .env / .env.local)
import { existsSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY not set");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const pager = await ai.models.list();
for await (const m of pager) {
  if (!m.supportedActions?.includes("generateContent")) continue;
  console.log(`${m.name?.replace("models/", "")}\t${m.displayName ?? ""}`);
}
