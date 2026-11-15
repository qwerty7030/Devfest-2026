// Compares latency of Gemini models on one image, so you can pick the fastest
// reliable one for GEMINI_MODEL.
// Usage: node scripts/bench-models.mjs path/to/frame.jpg [model ...]
import { existsSync, readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);
const [img, ...models] = process.argv.slice(2);
if (!img) {
  console.error("usage: node scripts/bench-models.mjs frame.jpg [model ...]");
  process.exit(1);
}
// Only probe the selected model unless comparison models were explicitly supplied.
const list = models.length ? models : [process.env.GEMINI_MODEL || "gemini-3.1-flash-lite"];
const data = readFileSync(img).toString("base64");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { retryOptions: { attempts: 1 } } });
const RUNS = 1;

for (const model of list) {
  const times = [];
  let lastErr = "";
  let sample = "";
  for (let i = 0; i < RUNS; i++) {
    const t = Date.now();
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [
          { inlineData: { mimeType: "image/jpeg", data } },
          { text: 'Return JSON {"person_visible": bool, "comments": [8 short livestream comments about the outfit, or [] if no person]}' },
        ] }],
        config: { responseMimeType: "application/json", abortSignal: AbortSignal.timeout(15000) },
      });
      times.push(Date.now() - t);
      sample = (res.text ?? "").slice(0, 80);
    } catch (e) {
      lastErr = (e instanceof Error ? e.message : String(e)).slice(0, 100);
    }
  }
  const ok = times.length;
  const avg = ok ? Math.round(times.reduce((a, b) => a + b, 0) / ok) : "-";
  console.log(`${model.padEnd(24)} ok ${ok}/${RUNS}  avg ${avg}ms  ${ok ? sample : lastErr}`);
}
