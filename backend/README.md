# Fit Check — Backend Service

This directory is reserved for the backend team working on **Fit Check**.

## Mission
1. Ingest camera frames or a short video clip from the frontend client.
2. Analyze the user's outfit using **Google Gemini Vision** (identifying garments, colors, fit, style archetype).
3. Generate real-time or batched audience-style commentary (like Instagram Live comments) using a secondary LLM provider.
4. Return structured fit check results and audience sentiment to the frontend.

For the exact request and response schemas, see [API_CONTRACT.md](./API_CONTRACT.md).
