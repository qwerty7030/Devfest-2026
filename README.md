# Fit Check — DevFest 2026

A camera-first style studio: a 15-second runway with outfit-aware comments, an automatic three-photo shoot, and a personal looks feed with blended AI and rules-based scores. The frontend and Gemini backend run together in **one Next.js application**.

## Run locally

Requires Node.js 22 or newer and npm.

```sh
npm ci
cp .env.example .env.local
# Add GEMINI_API_KEY to .env.local for personal AI reviews.
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local` and `npm.cmd` if execution policy blocks `npm`. Open http://localhost:3000.

Run only one development server for this checkout. The studio's opening screen shows the client revision and active server model. `/api/health` also exposes `revision`, `model`, and `aiConfigured` without credentials or a paid AI call. After pulling changes, stop the previous server, restart `npm run dev`, and hard-refresh the browser. Compare the displayed revision with `git rev-parse --short=7 HEAD`. A production `npm start` needs a fresh `npm run build` after pulling.

`npm run dev` explicitly uses port 3000 and fails if that port is occupied instead of silently opening another server on 3001. Development output lives in `.next-dev`; production build/start use `.next`. This keeps their generated manifests separate. Avoid starting a second dev server for the same checkout, even on a different port.

**No key?** Choose **Try the demo** for sample reactions and reports with no AI requests. Real sessions require a configured key for Gemini to see and discuss the outfit. If it is missing or unavailable, the app explains the problem; it never replaces outfit feedback with canned hype. Camera permission is requested only when you choose Enable camera.

## The experience

1. Enable a camera or explore the demo. The camera is centered with mirror, camera-switch, and sound controls. Partial outfits, upper-body views, and garment details work. Start never waits for person detection, full-body framing, or an AI configuration check.
2. Start the three-second countdown, stand in front of the camera, and show off naturally. The app records silent 2½-second clips while Gemini analyzes the latest rolling five-second window. It remembers pieces as you turn or reveal details, so a top, bottoms, shoes, and accessories can be recognized at different moments. Newly revealed pieces get comments before repeated feedback on familiar ones. The 15-second runway starts when clothing is first recognized, then keeps moving through poses and brief gaps; there is no full-body framing gate. Real comments are specific compliments marked **Works well** or constructive changes marked **Try this**. A whole window without a wearer stops new comments. Viewers and audience identities are simulated.
3. After the runway, pose for three automatic photos. Each has a pose cue and a full 3–2–1 countdown; there is no manual shutter or photo-mode selection. Three additional snapshots are sampled during the runway using the existing camera capture function.
4. A single final review sends up to three photos: two runway samples and the last posed photo. Gemini estimates the visible garments and their scoring features, and supplies an independent holistic AI score. The supplied `evaluateOutfit` function computes fit/drape, 7–8 points, hierarchy, continuity, and the fit gate. Final score = (AI score + rules score × 100) / 2, rounded to one decimal. Rules use AI-estimated features, so they are not an independent visual measurement; partial views score only visible pieces.
5. `/feed` shows all saved looks, every captured photo, AI/rules/final scores, and an expandable breakdown. Browse photos, download them, delete a look, or start another. Photos and reports are saved in this browser's IndexedDB; nothing posts to a social network or uploads to an app database. Clearing browser site data removes saved looks. Demo scores use clearly labeled sample features.

Camera failures, missing configuration, provider errors, unclear photos, and cancellation have recovery paths. A failed real analysis never silently becomes a mock score.

## Configuration

- `GEMINI_API_KEY`: server-only key from Google AI Studio. Never use a `NEXT_PUBLIC_` prefix.
- `GEMINI_MODEL`: defaults to `gemini-3.1-flash-lite` for both live video feedback and the final photo report. It supports video, images, and structured output; availability and quota depend on your key. `node scripts/list-models.mjs` lists accessible models. Quota exhaustion pauses live capture/analysis and shows the actual issue; it is never presented as an inability to see clothing.
- `GEMINI_THINKING`: `minimal`, `low`, `medium`, `high`, or `off`. Defaults to `low`; use `off` if your chosen model rejects thinking configuration.

Only outfit styling is rated. Short silent clips and up to three selected snapshots are sent to Google Gemini during an explicitly started real session. Clips stay in a bounded in-memory buffer and are discarded as newer clips arrive; no audio is captured. Browsers without supported video recording send a short timestamped sequence of camera frames instead. Completed photos and reports persist locally in IndexedDB for the looks feed, not on the app server. Downloads are controlled by the user. Google's processing and retention depend on your Gemini service terms.

## Request budgets and cooldowns

Video input follows [Google's video-understanding guide](https://aistudio.google.com/docs/video-understanding?generate-content=true): short clips are sent inline using `generateContent`, with `videoMetadata.fps: 2` and the outfit prompt after the media. Sampling twice per second gives brief outfit details more chances to be seen than the default one FPS. Each rolling window is still one model request, not one request per sampled frame. This increases visual input tokens, while the existing duration and request limits keep usage bounded. Static video processing suits these short clips; agentic navigation and Files API uploads are unnecessary for this flow.

An ordinary fit check can make at most **two live Gemini attempts, at least ten seconds apart, and one final report attempt**. Comments from those batches are paced locally; each displayed comment does not make a model call. Collection stops after two checks or 30 seconds even if no outfit is recognized. Hidden tabs do not start new live requests. Explicit retakes start a new manual analysis session and still obey the shared limits.

Both endpoints enforce a shared ceiling of **four provider calls per rolling minute** and **100 per Pacific calendar day**, with one provider call in flight. Configure `GEMINI_APP_REQUESTS_PER_MINUTE` and `GEMINI_APP_REQUESTS_PER_DAY` at or below the actual Google project limits, then restart. Google also applies token limits and counts usage from other apps in the same project, which this app cannot measure.

Only session/request identifiers and counters are persisted in ignored `data/.runtime/`; API keys, images, videos, and model responses are not written there. The file lock coordinates local server processes and survives restarts. Multi-host deployments need a shared external store instead of instance-local files. Replayed request ids share an in-memory result/in-flight call, and the SDK is explicitly limited to one attempt.

A provider 429 is classified as either a minute-level cooldown or a daily exhaustion. The server remembers the cooldown and blocks further calls before they reach Google. Daily limits remain blocked until the provider's reset time (at least midnight Pacific). A new API key in the same Google project does not create fresh project quota. No automatic key/model rotation or billing changes are performed.

An explicit `GEMINI_MODEL` change uses the selected model's available project quota. It does not reset Google's usage or the app's shared counters. Provider cooldowns are scoped to the model that failed, so an exhausted previous model does not block the new selection. The app cannot see calls made by other apps or keys in the project: check AI Studio's active limits before testing. The optional benchmark script makes one call per explicitly selected model and defaults to the configured model alone; these manual probes are separate from the app ledger and consume Google quota.

## Project layout

- `app/`: Next.js entry page, layout, API routes, and backend debug screen at `/debug`.
- `frontend/src/`: React studio, camera/posing/live components, client API adapter, and explicit demo provider.
- `frontend/src/services/clipCapture.ts`: complete MP4 clip capture, with ordered-frame fallback where H.264 recording is unsupported; `outfitSession.ts` maintains session inventory, coverage, and duplicate suppression.
- `lib/fitcheck/`: person detection, existing backend live hook, prompts, image validation, and result sanitization.
- `public/models/`: local detector model; MediaPipe WASM is copied to `public/mediapipe/` by `npm ci`.
- `backend/API_CONTRACT.md`: the implemented REST contract. No separate backend process or WebSocket server is needed.
- `tests/`: request validation, result sanitization, and route behavior tests.

Install dependencies at the repository root. `frontend/package.json` only forwards commands to the root application; the old separate Vite build has been retired.

## Checks and production

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Deploy as a Node.js Next.js app (for example on a Next.js-compatible host). Set the Gemini variables on the server and serve over HTTPS for camera access outside localhost. `/api/health` reports availability and whether the key is configured without returning credentials. CI checks lint, types, tests, and the production build without an API key.

The APIs are intended for a trusted demo environment. Before unrestricted public access, put authentication/rate limiting and provider spending quotas in front of the AI endpoints. There is no account system or durable session storage in this project.

Next.js uses the patched 15.5 maintenance line. Dependency overrides keep its CSS and image-processing dependencies patched; the lockfile is authoritative.
