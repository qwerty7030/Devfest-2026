# Fit Check API

All routes are same-origin REST endpoints. There is no WebSocket requirement or separate port 8000 service. API keys stay on the server. Responses use JSON; successful AI responses have `Cache-Control: no-store`.

## `GET /api/health`

Returns `{ "status": "ok", "aiConfigured": true }`. The boolean checks key presence, not whether Google accepts the key or model.

## `POST /api/comments`

Request: `{ "frame": "<base64 JPEG without data prefix>", "recent": ["previous comment"] }`.

Response: `{ "person_visible": true, "vibe": "relaxed utility", "rating": 8.5, "comments": [{ "text": "The olive layers work together", "tone": "hype" }] }`.

`vibe` and `rating` are optional; rating is 0–10. Tones are `hype`, `roast`, `question`, or `emoji`. Up to 12 comments are returned; text is capped at 150 characters. Only the last 20 recent comments are considered. No visible person produces an empty comment list. The client polls sequentially with a four-second delay after completion and paces comment display.

The client shows generic local chatter immediately and while requests are pending, unavailable, or return no visible clothing. These comments are labeled **Simulated**, never attributed to Gemini or presented as outfit observations. Valid AI comments take delivery priority without discarding the previous batch. Stop cancels pending requests and all delivery timers. The status line distinguishes missing server configuration from a temporary reconnect.

## `POST /api/fitcheck/analyze`

Request: `{ "snapshotBase64": "data:image/jpeg;base64,..." }`. Raw JPEG base64 also works. The client analyzes the first photo and retains the other photo locally.

Response: `{ "status": "success", "data": { ... } }`, where `data` includes:

- `overallScore` (0–100), `archetype`, `summary`, `caption`, and `source: "ai"`.
- `garments`: up to eight items with `category`, `description`, `color`, `confidence` (0–1), optional `highlight` and percentage tag positions.
- `topComments`: up to three simulated audience comments with local avatar URLs, generated identifiers, username, comment, and display fields.
- `likesCount: 0`. Social engagement is not fabricated by this endpoint.

Client-side `capturedPhotos`, `capturedSnapshotUrl`, and `timestamp` are appended after a successful response. They are not stored on the server. The server sanitizes model output and rejects incomplete reports.

## Limits and errors

JPEGs must have a JPEG signature and be under 2,000,000 base64 characters. The actual request body stream is limited to 3 MB. The camera downsizes captures to at most 960 pixels wide and JPEG quality 0.78. Gemini deadlines are 8 seconds for commentary and 25 seconds for analysis; browser cancellation propagates to the model request.

Failures use `{ "error": "A user-readable explanation" }`: 400 for malformed input, 413 for oversized payloads, 422 for no discernible outfit, 502 for incomplete analysis, and 503 for missing configuration or provider failure. Failed real sessions do not return sample scores. Demo mode uses only the client mock provider and is explicitly labeled.

Endpoints do not implement authentication or durable rate limiting. Restrict access or add an authenticated gateway and spending limits before a public launch.
