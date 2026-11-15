# Drip Score API

All routes are same-origin REST endpoints. There is no WebSocket requirement or separate port 8000 service. API keys stay on the server. Responses use JSON; successful AI responses have `Cache-Control: no-store`.

Both AI endpoints use the server's `GEMINI_MODEL`, defaulting to `gemini-3.1-flash-lite`. An explicit model change preserves the app-wide usage counters; provider cooldowns and cached responses are scoped to the selected model. The same project key can be used when it has access to the model. Quota availability must be checked in AI Studio.

App clients include `sessionId` (one UUID per drip score) and `requestId` (one UUID per distinct analysis). Preserve a request id when replaying the same report. Concurrent/replayed ids share an in-memory response/in-flight call without another provider attempt. Legacy diagnostics without ids share a capped diagnostic session.

The server permits at most two live attempts and one report attempt per session, one in-flight provider request, a ten-second minimum gap, and defaults of four calls per rolling minute / 100 per Pacific day across both endpoints. A locked, ignored `data/.runtime/budget.json` coordinates local processes and survives restarts. Only counters and opaque ids are stored, not keys or camera data. For multiple hosts, replace the local ledger with a shared store.

## `GET /api/health`

Returns `{ "status": "ok", "aiConfigured": true }`. The boolean checks key presence, not whether Google accepts the key or model.

## `POST /api/comments`

Live request: `{ "clips": [{ "video": { "data": "<base64 WebM or MP4>", "mimeType": "video/webm" }, "durationMs": 2500 }], "knownItems": [{ "id": "jacket", "category": "Outerwear", "description": "Olive work jacket" }], "coveredParts": [{ "id": "jacket", "comments": 1 }], "recent": ["previous comment"] }`.

Each request contains the latest one or two independently finalized clips, in chronological order, totaling at most eight seconds. The standard rolling window is two 2½-second clips. The browser prefers MP4/H.264, verified with the live provider. On browsers without supported MP4 recording, a clip contains `frames: [{ "frame": "<base64 JPEG>", "offsetMs": 0 }, ...]` with 2–6 ordered timestamped frames instead of `video`. WebM is accepted by the endpoint but is not selected by the browser because its live decoding was unreliable in validation. The backend diagnostic screen can still send a legacy single `frame`.

Gemini receives native video inputs sampled at two frames per second using `videoMetadata.fps`, or the ordered frame sequence. This follows [Google's short inline-video flow](https://aistudio.google.com/docs/video-understanding?generate-content=true) with static processing and the prompt after the media. Both clips share one model request; sampling does not trigger separate requests per frame. It combines clear moments across each clip; no exact frame must contain the whole outfit. The prompt supplies the session's previous observations, per-piece comment counts, and recent comments. Existing item ids are reused when possible and newly revealed, under-discussed pieces receive priority. Caller-supplied memory is contextual input, not proof of current presence. The client sends at most two live requests with ten-second spacing, stops collection after 30 seconds, and does not start live requests while the tab is hidden.

Response example:

```json
{
  "person_visible": true,
  "observations": [{ "id": "jacket", "category": "Outerwear", "description": "Olive green work jacket with long cuffs" }],
  "vibe": "relaxed utility",
  "rating": 8.5,
  "comments": [
    { "text": "The olive jacket gives the outfit a strong earthy layer.", "tone": "hype", "aspect": "color", "evidenceIds": ["jacket"], "suggestion": "" },
    { "text": "The long jacket cuffs could use more definition.", "tone": "critique", "aspect": "fit", "evidenceIds": ["jacket"], "suggestion": "Try rolling the cuffs once." }
  ]
}
```

`vibe` and `rating` are optional; rating is 0–10. The model observes visible pieces before generating comments. Tones are `hype` (specific praise) and `critique` (constructive styling criticism). Up to eight comments are returned, capped at 220 characters each. Every comment must reference an observed item's id, and critiques must include an actionable `suggestion`; invalid entries are dropped. The server alternates praise and critique. Only the last 20 recent comments are considered.

No wearer anywhere in the rolling window returns `person_visible: false`, `observations: []`, and `comments: []`. Upper-body views, turns, close-ups, and cropped poses are valid. Capture continues during inference with only one request in flight and a two-clip buffer, so slow requests cannot create an upload backlog. Grounded comments arrive every 1.1 seconds. Session memory merges recognized pieces across clips, prioritizes uncovered pieces, and suppresses repeated text and repeated item/tone/aspect feedback. Undelivered feedback expires after 15 seconds. No wearer clears queued comments but retains the recent outfit inventory. Missing keys and provider failures show status errors instead of canned hype. Stop aborts requests, recording, and delivery timers. The runway starts after initial recognition and then runs continuously for 15 seconds without freezing on an imperfect pose.

## `POST /api/fitcheck/analyze`

Request: `{ "snapshotsBase64": ["data:image/jpeg;base64,..."] }`, with one to three JPEGs from the same outfit session. Legacy `snapshotBase64` and raw JPEG base64 still work. The app sends two runway snapshots and the last automatic posed photo in one provider call. Garments are deduplicated across views; the feed retains all six captures locally.

Response: `{ "status": "success", "data": { ... } }`, where `data` includes:

- `overallScore` (0–100), `aiScore` (0–100), `rulesScore` (0–100), `archetype`, `summary`, `caption`, and `source: "ai"`. The final `overallScore` is the 50/50 average rounded to one decimal.
- `rules`: the supplied scoring function's normalized 0–1 breakdown, points, fit gate, and notes. `scoringGarments` contains Gemini's visible garment feature estimates. Missing/invalid scoring features reject the report rather than inventing defaults.
- `garments`: up to eight items with `category`, `description`, `color`, `confidence` (0–1), optional `highlight` and percentage tag positions.
- `topComments`: up to three simulated audience comments with local avatar URLs, generated identifiers, username, comment, and display fields.
- `likesCount: 0`. Social engagement is not fabricated by this endpoint.

Client-side `capturedPhotos`, `capturedSnapshotUrl`, and `timestamp` are appended after a successful response. They are not stored on the server. The server sanitizes model output and rejects incomplete reports.

## Limits and errors

Each WebM/MP4 clip is limited to four million decoded bytes and 0.5–6 seconds, and its container signature is checked. At most two clips and eight seconds are accepted. The comments request stream is capped at 12 MB; ordinary 1 Mbps clips are substantially smaller. Hosts may impose lower body limits. JPEG fallback frames must have a JPEG signature and be under 2,000,000 base64 characters, with strictly increasing offsets. Photo analysis requests are capped at 6.1 MB, with at most three JPEGs and the existing per-photo limit. The camera downsizes JPEG captures to at most 960 pixels wide and quality 0.78. Gemini deadlines are 25 seconds for commentary and analysis; the live client allows 30 seconds including network overhead. Cancellation propagates to the model request. These timeouts do not add requests or bypass usage limits.

Failures use `{ "error": "A user-readable explanation", "code": "optional machine-readable reason", "retryAfterSeconds": 60 }`: 400 for malformed input, 413 for oversized payloads, 422 for no discernible outfit, 502 for incomplete analysis, and 503 for missing configuration or provider failure. A 429 distinguishes `APP_COOLDOWN`, `APP_DAILY_BUDGET`, `SESSION_BUDGET_REACHED`, `AI_RATE_LIMITED`, and `AI_DAILY_QUOTA_EXHAUSTED`. Retryable cooldowns include `Retry-After`. Provider cooldowns are persisted per model, so another tab/session cannot immediately hammer a blocked model. SDK attempts are fixed at one. Failed real sessions do not return sample scores. Demo mode uses only the client mock provider and is explicitly labeled.

Endpoints do not implement authentication or durable rate limiting. Restrict access or add an authenticated gateway and spending limits before a public launch.
