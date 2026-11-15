# oko: Handoff for Claude Design

You're rebuilding the user interface of **oko**, a hackathon web app (DevFest 2026, Google stack). The UI needs a fresh, original design. The camera, AI, scoring, and storage logic already work and must keep working. After the rebuild, the user will discuss **new front-end features** with you directly; section 10 explains how to approach those.

Everything you need is here. File paths are real paths in the repo (`main` branch), so your output can drop into the codebase.

---

## 1. What the app does

A camera-first style studio:
1. The user enables their camera and taps **Start fit check**.
2. After a **3-2-1 countdown**, they get a **15-second runway**. They show off their outfit while a simulated live audience comments. The comments are real **Gemini** feedback on what it sees: specific praise ("Works well") and constructive tips ("Try this").
3. The app then takes **three automatic posed photos**, each with its own countdown and a pose cue.
4. Gemini writes a **style report**. The final score blends an AI score with a rules-based styling score: (AI + rules) ÷ 2.
5. Every look is saved in **this browser** (IndexedDB) and shown on a **"My looks" feed** (`/feed`). From there the user can browse photos, download them, see the score breakdown, and delete looks.

Nothing is posted anywhere. The audience is simulated. There's a **demo mode** (an animated virtual model with sample data and no API calls) for trying it without a camera or API key.

---

## 2. Hard constraints

1. **Original branding.** The app is "oko". Livestream and social *conventions* are fine (a LIVE indicator, a chat feed, a post-style card). **No Instagram, TikTok, or other platform logos, glyphs, wordmarks, or look-alike marks.** One existing component is named `InstagramPostCard`; don't carry that branding into the design.
2. **Camera-first.** On the studio page, the live camera (mirrored by default) is the hero. During the runway and the photos the person stands back from the screen, so **keep the centre clear**: UI goes in the top band, the bottom band, and the side edges.
3. **Readable over video and from a distance** during RUNWAY and POSING: scrims or glass, WCAG AA contrast, and a large countdown and pose cues.
4. **Responsive:** the camera stage is ~470px wide, centred on desktop (height `min(760px, 100dvh − 140px)`), and full-height on phones (≤ 600px). The feed is a single column, max 580px wide.
5. **Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + plain CSS (`frontend/src/studio.css`) + **lucide-react** icons + `canvas-confetti` (available).
6. **Tone:** confident, fashion-forward, kind. Comment on **clothes and styling only, never bodies or looks**. The results already say "An AI perspective on your styling, never a rating of you"; keep that spirit.
7. **Be honest:**
   - Demo results are always labelled as samples.
   - Errors explain the real problem (quota, missing key, unclear photo). Never fake a score.
   - Simulated viewers and audience are fine.

---

## 3. Pages and routes

| Route | File | What it shows |
|---|---|---|
| `/` | `app/page.tsx` → `frontend/src/App.tsx` | The studio: camera, countdown, runway, posing, analyzing |
| `/feed` | `app/feed/page.tsx` → `frontend/src/components/Results/LooksFeed.tsx` | "My looks": saved looks, newest first |
| `/debug` | `app/debug/page.tsx` | Backend diagnostic page. **Out of scope.** |

When a review finishes successfully, the studio saves the look and **navigates to `/feed`**, with the new look at the top.

---

## 4. Flow (`AppState` in `frontend/src/types/fitCheck.ts`)

```
READY ──Start fit check──► COUNTDOWN (3-2-1, Go) ──► RECORDING (15s runway) ──► POSING (3 auto photos) ──► ANALYZING ──► saved ──► /feed
  ▲                              │ ✕                        │ ✕                      │ ✕                       │ ✕ / error → Retry or Back to camera
  └──────────────────────────────┴──────────────────────────┴────────────────────────┴─────────────────────────┘
```

`AppState = 'READY' | 'COUNTDOWN' | 'RECORDING' | 'ANALYZING' | 'POSING' | 'RESULTS'`. (`RESULTS` renders the feed inline while saving, then the app routes to `/feed`.)

### READY
- **Toolbar:** a "Camera" / "Demo" label, plus icon buttons for **Mirror** (`aria-pressed`), **Switch camera** (disabled in demo or when the camera is off), and **Sound** (starts muted).
- **Before the camera is on:** a welcome message, "Show your fit." with a camera icon.
- **Controls:**
  - Primary button with three states: **"Enable camera"** → **"Connecting…"** (disabled) → **"Start fit check"**.
  - Text button **"Try demo"** / **"Use my camera"**.
  - Privacy note: *"Clips go to Gemini. Photos save to this browser."* In demo: *"Sample session · no API calls"*.
  - Warning when the server has no key: *"AI is not configured."*
  - A collapsible **"Connection"** detail showing `revision · model` (e.g. `local · gemini-3.1-flash-lite`).
- **Camera states** (`CameraPreview`):
  - Loading.
  - **"Camera Access Needed"**, with **Retry Camera Permission** and **Launch Virtual Demo Feed**.
  - The live video.
  - The demo canvas: an animated stylised model on a studio backdrop, with a "Virtual Demo Feed" chip.

### COUNTDOWN
"Get ready" above a huge **3 → 2 → 1 → Go**, a tick sound each second, a chime on Go, and a ✕ cancel button.

### RECORDING (the 15 s runway)
- **Live toolbar:** a "● Live" indicator, the seconds remaining (`15s`→`0s`), and ✕ stop. A thin progress line runs under it.
- **The clock only starts once Gemini first recognises clothing.** Until then it reads 15s. Design a clear "looking for your outfit…" moment.
- **Status pill** (provider messages; design for all of these):
  - "Show off naturally · watching the first moments of your outfit"
  - "Following your outfit · fresh feedback as you show more"
  - "Step into view and show off · your outfit is remembered"
  - "Outfit captured · playing your personalized feedback"
  - "No outfit recognized after two checks. Start a new fit check in better light."
  - "Gemini quota reached. Live analysis is paused."
  - "Cooling down before the next…"
  - "Live analysis window ended. Your existing outfit feedback is still available."
- **Pose cue** by elapsed time: 0–4 s "Show your outfit" · 4–8 "Try a turn" · 8–12 "Show the details" · 12–15 "Photos up next".
- **Live chat** (`LiveChat`): appears once an outfit is recognised (always in demo). New comments arrive about every **1.1 s**. See section 6 for the comment shape.
  - Badge **"Works well"** (`feedbackType: 'compliment'`) or **"Try this"** (`'suggestion'`).
  - Suggestions add a line **"Try: …"**.
  - `tag` shows which piece was seen, e.g. "Seen: Olive work jacket".
- At 15 s it moves to POSING automatically. Three runway snapshots are captured in the background.

### POSING (three automatic photos)
- "Photo **n** / 3" with the cues **"Hold your pose"** → **"Try another angle"** → **"One last look"**, and the line *"Your photo is taken automatically."*
- Each photo: a ~1.2 s pause, then a big **3-2-1**, then a **white flash** and shutter sound.
- On error: *"Camera not ready."* plus a **Restart countdown** button. ✕ cancels.

### ANALYZING
- A spinner ring, **"Reviewing your look"**, and the subline **"One outfit. Two perspectives."** (AI score + rules score). ✕ cancels.
- On error: **"Review paused"**, the real error message, **Retry review**, and **Back to camera**.
- **Errors to cover:**
  - no outfit visible (422)
  - incomplete analysis (502)
  - AI not configured or provider down (503)
  - rate limits (429): app cooldown, daily app budget, session budget, provider rate limit, provider daily quota exhausted

### FEED (`/feed`, "My looks")
- **Nav:** the wordmark and **"New look ↗"**. On the studio page, the nav shows **"My looks ↗"** instead.
- **Heading:** "My looks", with "Saved on this browser."
- **States:**
  - **Loading:** "Loading looks…"
  - **Empty:** "Your next look starts here." + **Open camera**
  - **Notices:**
    - the save-failed notice from the studio
    - "Browser storage is unavailable. This look is available for this visit."
    - "Could not delete this look. Please try again."
- **Look card:**
  - **Header:** archetype title, a date like "Nov 15, 3:42 PM" (prefixed "Demo ·" for demo looks), and a 🗑 delete button.
  - **Photo carousel:** 4:5 ratio, all **6 photos** (3 posed + 3 runway), with an "n / 6" counter, prev/next buttons, a thumbnail strip, and a **save photo** button.
  - **Score line:** **Final score `84.5`/100**, then "AI `88`", "+", "Rules `81`", "÷ 2".
  - **Text:** the summary and the post caption (both multi-line).
  - **"Score breakdown +" / "Hide breakdown −" expander:**
    - the formula sentence
    - 4 sub-scores out of 100 (**Fit & drape**, **7–8 point method**, **Visual hierarchy**, **Color & weight continuity**)
    - "N styling points · Fit gate ×1"
    - the rule notes
    - the line "Rules are computed from AI-estimated garment features…"
    - per-garment features: name; fit, drape, points, hierarchy, colour family, visual weight
    - the top comments
  - **Demo looks** show "Sample review. Start a camera session for both scores." in place of the breakdown.

---

## 5. Data the UI renders

```ts
// frontend/src/types/fitCheck.ts
interface LiveComment {
  id: string; username: string; avatarUrl: string /* '/avatar.svg' */; comment: string /* ≤ 220 chars */; timestamp: number;
  badge?: string;            // live: 'Works well' | 'Try this'   (demo/user: 'VIP' | 'Stylist' | 'Verified' | 'Host' …)
  tag?: string;              // the garment it's about, e.g. 'Olive work jacket'
  isHighlighted?: boolean;
  feedbackType?: 'compliment' | 'suggestion';
  suggestion?: string;       // actionable tip on 'suggestion' comments
}
interface GarmentItem {
  category: 'Outerwear' | 'Tops' | 'Bottoms' | 'Footwear' | 'Accessories' | 'Overall Fit';
  description: string; color: string; confidence: number /* 0–1 */; highlight?: string;
  tagXPercent?: number; tagYPercent?: number;   // optional position for tagging the garment on a photo (not used yet)
}
interface FitResult {
  overallScore: number /* 0–100, one decimal */; aiScore?: number; rulesScore?: number;
  rules?: { totalScore, fitScore, pointsScore, hierarchyScore, continuityScore /* 0–1 */; fitGateMultiplier: number; totalPoints: number; notes: string[] };
  scoringGarments?: { name; category; fitQuality; drapeHarmony; points: 1|2; hierarchy; colorFamily; visualWeight }[];
  source?: 'ai' | 'demo';
  archetype: string; summary: string; caption: string /* post caption with hashtags */; likesCount: number /* 0 */;
  garments: GarmentItem[] /* ≤ 8 */;
  topComments: { id; username; comment; avatarUrl; badge?; timeAgo; likes }[] /* ≤ 3 */;
  capturedPhotos: string[] /* data URLs: 3 posed + 3 runway */; capturedSnapshotUrl?: string; timestamp: number;
}
type FitPost = FitResult & { id: string };      // a saved look (frontend/src/services/fitFeed.ts)
```

---

## 6. Code: what you rebuild vs what you keep

**Rebuild freely (presentation):**
- Components in use:
  - `components/Layout/PhoneFrame`: the page shell, nav, and camera stage
  - `Camera/CameraPreview`
  - `Countdown/CountdownOverlay`
  - `LiveOverlay/LiveChat`
  - `Posing/PosingScreen`
  - `Results/LooksFeed`
- Styling: `frontend/src/studio.css`, `frontend/src/index.css`, `app/globals.css`
- The JSX in `frontend/src/App.tsx`

**Present but unused:** `LiveHeader`, `CoachingCue`, `FloatingReactions`, `ReactionBar`, `SilhouetteGuide`, `ScannerOverlay`, `ResultsCard`, `GarmentBadge`, `TopReactions`, `StyleResults`, `InstagramPostCard`. They're leftovers from earlier versions. **Reuse them, redesign them, or delete them.** `StyleResults` is a full results page (photo tabs, score stamp, verdict, garment list, crowd quotes, editable caption with Copy and Share). It's a good candidate to bring back between ANALYZING and the feed.

**Keep the logic (call it; don't rewrite it):**

| Module | Use |
|---|---|
| `hooks/useCamera.ts` | `{ videoRef, isMirrored, isStarting, isCameraActive, hasPermission, errorMessage, isTestMode, startCamera, stopCamera, toggleMirror, toggleFacingMode, toggleTestMode, captureSnapshot }`. Attach `videoRef` to `<video autoPlay playsInline muted>`. |
| `hooks/useLiveReactions.ts` | `{ comments, reactions, viewerCount, addComment, triggerReaction, triggerBurst, clearLiveState, startViewerCounter, stopViewerCounter }`. Reactions and viewer count exist but aren't shown right now. |
| `services/apiProvider.ts` | `startLiveFeed(clipSource, onComment, onStatus, onObservations, sessionId) → stop()` and `analyzeFit(photos, signal, sessionId, requestId)` |
| `services/clipCapture.ts`, `outfitSession.ts`, `photoSequence.ts` | Video-clip capture, outfit memory and comment pacing, the 3-photo sequence |
| `services/mockProvider.ts` | Demo mode (`startLiveFeed`, `analyzeFit`) |
| `services/fitFeed.ts` | `saveLook`, `loadLooks`, `currentLooks`, `deleteLook` (IndexedDB) |
| `services/soundEffects.ts` | `setMuted`, `playTick`, `playGoChime`, `playShutter`, `playPop`, `playResultFanfare` |
| `GET /api/health` | `{ aiConfigured, model, revision }`, for the READY screen |

**In `App.tsx`, keep the behaviour of:**
- the stage effects: the RECORDING timer that starts on first recognition, the runway snapshots at 3/7/11 s, and the move to POSING at 15 s
- `begin`, `reset`, and `finish`, including the request-id reuse and abort handling
- the review photo selection: 2 runway photos + the last posed photo
- save, then route to `/feed`

You can move this into a hook (e.g. `useDripSession()`) if you split the UI up.

**Backend:** out of scope. Don't change `app/api/*` or `lib/fitcheck/*`.

**Gemini usage is strictly rationed:**
- per session: at most **2 live calls + 1 report call**
- across the app: **4 calls per minute** and **100 per day**

The UI must never add calls (no extra analyze or comments requests).

**Run and check:**
- From the repo root: `npm ci` → `cp .env.example .env.local` (add `GEMINI_API_KEY`) → `npm run dev` → http://localhost:3000. Run only one dev server.
- Demo mode needs no key.
- Before finishing: `npm run lint && npm run typecheck && npm test && npm run build`.

---

## 7. Sample content (use it in mocks)

**Live comments:**
- **Works well** · "The olive jacket gives the outfit a strong earthy layer." · Seen: Olive work jacket
- **Try this** · "The long jacket cuffs could use more definition." · *Try: rolling the cuffs once.*
- **Works well** · "Light wash denim keeps the darker top from feeling heavy." · Seen: Straight leg jeans

**A look:**
- Final **84.5** (AI 88 + Rules 81 ÷ 2) · **Modern Urban Minimalist**
- **Summary:** "The structured charcoal jacket paired with relaxed light wash denim creates an effortlessly clean silhouette. A subtle silver chain could elevate the whole look."
- **Caption:** "oko 84.5 · Modern Urban Minimalist. Charcoal layers, light wash denim, zero overthinking. #oko #DevFest2026 #OOTD"
- **Garments:**
  - Outerwear: Cropped Zip Jacket · Charcoal · 95% · "Crisp boxy fit"
  - Tops: Crewneck Tee · Black · 90%
  - Bottoms: Straight Leg Jeans · Light Wash Grey · 92%
- **Breakdown:** Fit & drape 86 · 7–8 point method 75 · Visual hierarchy 80 · Color & weight continuity 83 · 7 styling points · Fit gate ×1

---

## 8. Current look (reference only; replace freely)

- **Mood:** quiet, editorial, near-monochrome.
- **Colours:** `#101112` background, `#17191b` cards, thin `#ffffff12–1c` borders, and an off-white `#eeeeea` primary button with dark text. Lime and amber pills for "Works well" / "Try this".
- **Type:** Arial at light weights, small type, and the old lowercase wordmark "drip score®". The app is now named **oko**.
- **Wanted from the redesign:**
  - a distinctive oko identity
  - a runway moment with real energy: going live, the countdown, the chat, the last seconds
  - a satisfying photo-shoot moment
  - a results reveal worth screenshotting
  - a feed that feels like a personal lookbook
- **Motion:** keep it buildable (CSS keyframes, transitions, confetti) and respect `prefers-reduced-motion`. Touch targets ≥ 44px, `aria-label`s on icon buttons, and the existing `role="status"` / `role="log"` live regions.

---

## 9. Deliverables

- **Screens:** READY (camera off, camera on, demo, AI not configured), Camera Access Needed, COUNTDOWN, RECORDING (looking for your outfit, live with chat, last 3 s, quota-paused), POSING (cue, count, flash, error), ANALYZING (loading, error), results reveal (optional new screen), FEED (look card collapsed and expanded, empty, loading).
- **Desktop and ≤ 600px layouts.** Component styles and tokens (colour, type, spacing, radius, motion).

---

## 10. New features (the user will discuss these with you)

The user will bring new front-end features. When they do:
1. **Ask before assuming:** what it does, which stage or page it belongs to, and whether it has to work while the person is standing away from the screen.
2. **Check it against section 2.**
3. **No new AI calls from the frontend.** If a feature needs new AI output, say it needs a backend change to `/api/comments` or `/api/fitcheck/analyze`.
4. **Data that already exists but isn't shown** is free to use:
   - `viewerCount`, `reactions`, and `triggerBurst`
   - `vibe` and `rating` (from the live responses)
   - the garment `highlight`, `confidence`, and `tagXPercent`/`tagYPercent`
   - the comment `tag`
   - `topComments` `timeAgo` and `likes`
   - the full `rules` breakdown
5. **Where new logic goes:** new state goes through the existing hooks and services, and new stages go into the `App.tsx` flow (or a `useDripSession` hook). No stray timers in components.
6. **Before calling it done:** run the checks in section 6 and walk through the full flow in both demo and real mode.
