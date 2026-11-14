// Copies MediaPipe's WASM runtime into public/ so the detector loads from our
// own origin (no CDN dependency at the venue). Runs on `npm install`.
//   node scripts/copy-mediapipe-wasm.mjs            → Next app (repo root)
//   node scripts/copy-mediapipe-wasm.mjs frontend   → Vite app (frontend/)
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = process.argv[2] === "frontend" ? join(repoRoot, "frontend") : repoRoot;
const src = join(appRoot, "node_modules/@mediapipe/tasks-vision/wasm");
const dest = join(appRoot, "public/mediapipe/wasm");

if (!existsSync(src)) {
  console.warn(`[copy-mediapipe-wasm] ${src} not found; skipping`);
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[copy-mediapipe-wasm] copied wasm to ${dest}`);
