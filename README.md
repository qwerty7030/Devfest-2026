# Fit Check — DevFest 2026

A camera-first style studio: a 15-second runway with AI audience reactions, a one- or two-photo shoot, and a personal outfit report. The frontend and Gemini backend run together in **one Next.js application**.

## Run locally

Requires Node.js 22 or newer and npm.

```sh
npm ci
cp .env.example .env.local
# Add GEMINI_API_KEY to .env.local for personal AI reviews.
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local` and `npm.cmd` if execution policy blocks `npm`. Open http://localhost:3000.

**No key?** Choose **Try the demo** for sample reactions and reports with no AI requests. Real sessions require a configured key for Gemini to see and discuss the outfit. If it is missing or unavailable, the app explains the problem; it never replaces outfit feedback with canned hype. Camera permission is requested only when you choose Enable camera.

## The experience

1. Enable a camera or explore the demo. Mirror and front/back camera controls help frame the outfit; on-device MediaPipe detection supplies optional framing guidance. Partial outfits, upper-body views, and garment details work. Start never waits for person detection, full-body framing, or an AI configuration check.
2. Start the three-second countdown, stand in front of the camera, and show off naturally. The app records silent 2½-second clips while Gemini analyzes the latest rolling five-second window. It remembers pieces as you turn or reveal details, so a top, bottoms, shoes, and accessories can be recognized at different moments. Newly revealed pieces get comments before repeated feedback on familiar ones. The 15-second runway starts when clothing is first recognized, then keeps moving through poses and brief gaps; there is no full-body framing gate. Real comments are specific compliments marked **Works well** or constructive changes marked **Try this**. A whole window without a wearer stops new comments. Viewers and audience identities are simulated.
3. Capture one or two photos, immediately or using the three-second timer.
4. Generate a personal report: style score, archetype, visible garments, constructive styling notes, and AI crowd highlights. The first photo is analyzed; both photos remain available to save.
5. Edit or copy the caption, save a photo, retake photos, or start again. Sharing invokes the browser share menu (or copies the caption). Nothing posts to Instagram or another social network.

Camera failures, missing configuration, provider errors, unclear photos, and cancellation have recovery paths. A failed real analysis never silently becomes a mock score.

## Configuration

- `GEMINI_API_KEY`: server-only key from Google AI Studio. Never use a `NEXT_PUBLIC_` prefix.
- `GEMINI_MODEL`: defaults to `gemini-3.5-flash`, verified with native short video input; availability and quota depend on your key. `node scripts/list-models.mjs` lists accessible models. Quota exhaustion pauses live capture/analysis and shows the actual issue; it is never presented as an inability to see clothing.
- `GEMINI_THINKING`: `minimal`, `low`, `medium`, `high`, or `off`. Defaults to `low`; use `off` if your chosen model rejects thinking configuration.

Only outfit styling is rated. Short silent clips and the selected results photo are sent to Google Gemini during an explicitly started real session. Clips stay in a bounded in-memory buffer and are discarded as newer clips arrive; no audio is captured. Browsers without supported video recording send a short timestamped sequence of camera frames instead. This app does not persist clips, photos, comments, or reports to a database. Session data stays in browser memory until reset or reload; saved downloads are controlled by the user. Google's processing and retention depend on your Gemini service terms.

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
