# Deploy Drip Score to Firebase App Hosting

Live URL: https://drip-score--devfest2026-41803.us-central1.hosted.app

Verified on November 15, 2026: successful App Hosting rollout, home/feed pages, client scripts, configured health endpoint, native-video comments, and multi-photo blended scoring. Future source changes need the deploy command below; a Git push alone does not deploy this CLI-connected backend.

Project: `devfest2026-41803`. Intended backend: `drip-score` in `us-central1`.
Uses Firebase App Hosting's Next.js adapter for the UI and same-origin server API routes.
The Firebase browser SDK configuration does not authenticate deployments and is not the Gemini server key.
No Analytics, Firestore, or Storage SDK is needed just to host this app. Saved looks remain in each browser's IndexedDB.

Prerequisites: Firebase CLI 14.4+, an authenticated project owner/deployer, and the project's Blaze plan already enabled.

```powershell
firebase login --reauth
firebase apphosting:backends:list --project devfest2026-41803
# Run only if the intended backend does not exist:
firebase apphosting:backends:create --project devfest2026-41803 --backend drip-score --primary-region us-central1 --app 1:390529009617:web:c7adc802ceec2c405ac2f0 --root-dir .
```

Create the `drip-score-gemini-key` secret in this project's Cloud Secret Manager using the existing Gemini server key, and grant this App Hosting backend access with `firebase apphosting:secrets:grantaccess drip-score-gemini-key --backend drip-score --location us-central1 --project devfest2026-41803`. Its value must never appear in Git, a Firebase browser configuration, or a `NEXT_PUBLIC_` variable. `apphosting.yaml` references the secret at runtime only. The CLI accepts `firebase apphosting:secrets:set drip-score-gemini-key --data-file - --project devfest2026-41803` to read its value from stdin instead of putting it in command arguments. Do not paste a key into shell history.

```powershell
npm run build
firebase deploy --only apphosting:drip-score --project devfest2026-41803
```

`firebase.json` explicitly excludes local env files, artifacts, generated builds, dependencies, and runtime counters from the source upload. Do not deploy without these exclusions. Deployment uploads a source archive, builds remotely, and returns the actual HTTPS URL. Check `/`, `/feed`, `/api/health`, then one deliberate outfit session on that URL. Never treat a successful local build as proof of deployment.

The deployment is limited to one instance to reduce overlapping provider requests. Hosted request counters use writable `/tmp`, which is ephemeral: cold starts, restarts, and rollouts can reset the app's local daily ledger. Google's project quota still applies. Strict durable limits across deployments or multiple instances require a shared external counter store; the current local file ledger does not provide that guarantee.

Changing origins (localhost, Tailscale, Firebase) creates separate browser storage, so existing local photos do not automatically appear on the hosted domain. The camera requires HTTPS and explicit browser permission.
