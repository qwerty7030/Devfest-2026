# Fit Check — Camera-First Hackathon Project (DevFest 2026)

**Fit Check** is a camera-first web application that turns checking your outfit into an interactive, high-energy live stream experience. A user steps in front of the camera, counts down, walks into view, turns, and shows off their outfit for 10–15 seconds while a simulated Instagram Live audience floods the screen with real-time comments, floating reactions, and fluctuating viewer numbers. When complete, Gemini Vision and a secondary LLM provide an itemized garment breakdown, aesthetic archetype classification, and an overall Drip Score.

---

## 📁 Repository Structure

```
Devfest-2026/
├── frontend/               # React + TypeScript + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/     # Camera, LiveOverlay, Countdown, Analyzing, Results, Layout
│   │   ├── hooks/          # useCamera (WebRTC), useLiveReactions (Chat & Floating emojis)
│   │   ├── services/       # Pluggable FitCheckProvider & MockProvider, soundEffects
│   │   └── types/          # Full TypeScript models & state machines
│   ├── package.json
│   └── vite.config.ts
│
└── backend/                # Backend service folder (Dedicated for Backend Team)
    ├── README.md           # Backend setup & architecture overview
    └── API_CONTRACT.md     # Full WebSocket & REST specifications for Gemini Vision & LLMs
```

---

## 🚀 Running the Frontend

```bash
# 1. Navigate into the frontend folder
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Start the development server
npm run dev
```

Open the local URL (usually `http://localhost:5173`) in your browser.

## 🧠 Running the Gemini Backend

The frontend proxies `/api/*` to the Next.js backend at the repo root. Run it in a second terminal:

```bash
# from the repo root
npm install                 # also copies MediaPipe's wasm into public/
cp .env.example .env.local  # add GEMINI_API_KEY (https://aistudio.google.com/apikey)
npm run dev                 # → http://localhost:3000
```

- With the backend running, live comments and the results card come from Gemini.
- **Continuous live mode (no recording step):** the stream is always up. MediaPipe (in the browser) detects when someone walks into frame and the live comments start. When they leave for ~2.5s, Gemini scores their last frame and the results card shows, then it's back to waiting for the next person. **Space** = go live manually, **Esc** = back to waiting. *(This replaces the countdown and 15s recording flow described below.)*
- **Quota:** `GEMINI_MODEL` is a fallback chain. If one model hits its quota (429), the backend moves to the next, and if all are limited, the app runs on canned comments until the quota resets. While someone is live, the app calls Gemini about once every 6s, and never from a hidden tab.
- If the backend is down or errors, the chat keeps going with canned filler and the results fall back to mock data.
- `VITE_USE_MOCK=1 npm run dev` (in `frontend/`) uses the original mock provider only.
- Comment style examples come from `data/fitcheck_comments.json` (see [backend/README.md](backend/README.md)).

---

## ✨ Frontend Features & State Flow

1. **Ready Screen**:
   - Mirrored webcam feed (`transform: scaleX(-1)`).
   - Full Outfit Silhouette Guide overlay prompting the user to step back until their whole outfit fits.
   - Quick toggles: Mirror flip, front/back camera switch, audio cues mute, and **Virtual Demo Mode** (simulated runway model feed for testing without a webcam).

2. **Countdown Screen**:
   - Animated 3-2-1 countdown overlay with procedural audio tick cues and posing tips.

3. **Recording Screen (10–15s Live Fit Check)**:
   - **Instagram Live Header**: Pulsing red `● LIVE` badge, fluctuating viewer count (~1.4k to 2.8k), 15-second radial progress countdown.
   - **Stage Pacing Coach**:
     - `0-4s`: "Step back & show full silhouette 🚶"
     - `4-8s`: "Hit a slow 360° turn 🔄"
     - `8-12s`: "Highlight details, shoes & jewelry 👟"
     - `12-15s`: "Hold your final pose 📸"
   - **Live Audience Banter**: Realistic auto-scrolling comments arriving in real-time with verified creator badges and natural delays.
   - **Floating Reaction Hearts**: Instagram Live style hearts, flames, and 100s rising from the bottom right with organic sway.
   - **Interactive Reaction Bar**: Tap-to-burst heart button, quick emoji reactions, and comment input box.

4. **Analyzing Screen**:
   - Laser scanner beam scanning up and down over the captured fit snapshot.
   - Multi-step status indicator showing Gemini Vision garment segmentation and LLM crowd polling.

5. **Results Screen**:
   - Glowing **Drip Score** badge (e.g. `95 / 100 DRIP`).
   - Style Archetype classification (e.g. `Neo-Streetwear Minimalist`).
   - Itemized garment cards with category, color swatch, confidence rating, and style highlight.
   - "Crowd Highlights" reel featuring top audience quotes.
   - Captured photo preview with one-click download and share buttons.
   - Victory fanfare sound and confetti celebration!
