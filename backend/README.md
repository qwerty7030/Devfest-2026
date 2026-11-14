# Fit Check — Backend Service

This directory is reserved for the backend team working on **Fit Check**.

## Mission
1. Ingest camera frames or a short video clip from the frontend client.
2. Analyze the user's outfit using **Google Gemini Vision** (identifying garments, colors, fit, style archetype).
3. Generate real-time or batched audience-style commentary (like Instagram Live comments) using a secondary LLM provider.
4. Return structured fit check results and audience sentiment to the frontend.

For the exact request and response schemas, see [API_CONTRACT.md](./API_CONTRACT.md).

## Where the backend lives

The backend is the **Next.js app at the repo root**, not this folder:

| Endpoint | File |
|---|---|
| `POST /api/comments` (live comments) | [app/api/comments/route.ts](../app/api/comments/route.ts) |
| `POST /api/analyze` (results card) | [app/api/analyze/route.ts](../app/api/analyze/route.ts) |
| Shared Gemini client, model, thinking config | [lib/fitcheck/gemini.ts](../lib/fitcheck/gemini.ts) |
| Comment prompt + few-shot loading from `data/` | [lib/fitcheck/prompt.ts](../lib/fitcheck/prompt.ts) |

Backend test page: `http://localhost:3000/debug`. Model tools: `node scripts/list-models.mjs` (what your key can use)
and `node scripts/bench-models.mjs frame.jpg` (latency).
