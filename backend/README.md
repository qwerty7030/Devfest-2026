# Backend

The backend is implemented as Next.js routes in `app/api/`, served by the same process and origin as the frontend. Run `npm ci` and `npm run dev` from the repository root. Set `GEMINI_API_KEY` in `.env.local` for real AI requests.

`POST /api/comments` generates outfit-aware live commentary. `POST /api/fitcheck/analyze` produces the final structured style report. `GET /api/health` reports configuration status. See [API_CONTRACT.md](./API_CONTRACT.md).

The detector and original backend live hook remain under `lib/fitcheck/`; `/debug` exposes the backend diagnostic UI. The main studio uses its camera hook with the shared detector and a cancellable HTTP adapter. It does not open a second camera stream.
