// Copies MediaPipe's WASM runtime into public/ so the detector loads from our
// own origin (no CDN dependency at the venue). Runs on `npm install`.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const dest = join(root, "public/mediapipe/wasm");

if (!existsSync(src)) {
  console.warn("[copy-mediapipe-wasm] @mediapipe/tasks-vision not installed; skipping");
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("[copy-mediapipe-wasm] copied wasm to public/mediapipe/wasm");
