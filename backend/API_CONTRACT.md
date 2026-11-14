# Fit Check API

All routes are same-origin REST endpoints. There is no WebSocket requirement or separate port 8000 service. API keys stay on the server. Responses use JSON; successful AI responses have `Cache-Control: no-store`.

## `GET /api/health`

Returns `{ "status": "ok", "aiConfigured": true }`. The boolean checks key presence, not whether Google accepts the key or model.

## `POST /api/comments`

Request: `{ "frame": "<base64 JPEG without data prefix>", "recent": ["previous comment"] }`.

Response example:

```json
{
  "person_visible": true,
  "observations": [{ "id": "jacket", "category": "Outerwear", "description": "Olive green work jacket with long cuffs" }],
  "vibe": "relaxed utility",
  "rating": 8.5,
  "comments": [
    { "text": "The olive jacket gives the outfit a strong earthy layer.", "tone": "hype", "evidenceIds": ["jacket"], "suggestion": "" },
    { "text": "The long jacket cuffs could use more definition.", "tone": "critique", "evidenceIds": ["jacket"], "suggestion": "Try rolling the cuffs once." }
  ]
}
```

`vibe` and `rating` are optional; rating is 0–10. The model observes visible pieces before generating comments. Tones are `hype` (specific praise) and `critique` (constructive styling criticism). Up to eight comments are returned, capped at 220 characters each. Every comment must reference an observed item's id, and critiques must include an actionable `suggestion`; invalid entries are dropped. The server alternates praise and critique. Only the last 20 recent comments are considered.

No wearer or no observed clothing returns `person_visible: false`, `observations: []`, and `comments: []`. Upper-body views and cropped poses are valid. The client polls sequentially with a three-second delay after completion and delivers grounded comments every 1.1 seconds. It never emits canned comments in real mode, drops queued comments when no wearer is visible, and expires undelivered feedback after ten seconds. Missing keys and provider failures are visible status errors. Stop aborts requests and delivery timers. The runway timer waits for clothing observations and pauses when observations are lost.

## `POST /api/fitcheck/analyze`

Request: `{ "snapshotBase64": "data:image/jpeg;base64,..." }`. Raw JPEG base64 also works. The client analyzes the first photo and retains the other photo locally.

Response: `{ "status": "success", "data": { ... } }`, where `data` includes:

- `overallScore` (0–100), `archetype`, `summary`, `caption`, and `source: "ai"`.
- `garments`: up to eight items with `category`, `description`, `color`, `confidence` (0–1), optional `highlight` and percentage tag positions.
- `topComments`: up to three simulated audience comments with local avatar URLs, generated identifiers, username, comment, and display fields.
- `likesCount: 0`. Social engagement is not fabricated by this endpoint.

Client-side `capturedPhotos`, `capturedSnapshotUrl`, and `timestamp` are appended after a successful response. They are not stored on the server. The server sanitizes model output and rejects incomplete reports.

## Limits and errors

JPEGs must have a JPEG signature and be under 2,000,000 base64 characters. The actual request body stream is limited to 3 MB. The camera downsizes captures to at most 960 pixels wide and JPEG quality 0.78. Gemini deadlines are 12 seconds for commentary and 25 seconds for analysis; browser cancellation propagates to the model request.

Failures use `{ "error": "A user-readable explanation" }`: 400 for malformed input, 413 for oversized payloads, 422 for no discernible outfit, 502 for incomplete analysis, and 503 for missing configuration or provider failure. Failed real sessions do not return sample scores. Demo mode uses only the client mock provider and is explicitly labeled.

Endpoints do not implement authentication or durable rate limiting. Restrict access or add an authenticated gateway and spending limits before a public launch.
