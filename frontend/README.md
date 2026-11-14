# Fit Check frontend

The UI now runs inside the root Next.js application with the Gemini API routes on the same origin. Install once from the repository root with `npm ci`, then run `npm run dev` and open http://localhost:3000.

Source remains in `frontend/src/`. `App.tsx` owns the session flow; `services/apiProvider.ts` connects real camera sessions to the API. `services/mockProvider.ts` is used exclusively in the clearly labeled virtual demo. `studio.css` supplies the responsive studio and results styling.

The forwarding scripts here also support `npm run dev` and `npm run build` from this folder. Do not install separate frontend dependencies. See the root README for configuration, production commands, and verification.
