# oko: UI Redesign Brief (Figma AI)

Design a responsive, camera-first web app called **oko**. The user enables their camera and taps Start. After a 3-2-1 countdown they get a **15-second runway** where a simulated live audience comments on their outfit: real AI feedback marked "Works well" or "Try this". Then **three automatic posed photos**, an AI style review, and the look is saved to a personal **"My looks" feed** in the browser.

## Constraints
- **Original branding.** No Instagram/TikTok logos or look-alike marks.
- **Camera stage:** centred, ~470px wide on desktop, full-height on phones. Keep the centre clear during the runway and photos (the person stands back), and make cues readable from 1.5m.
- **Readable over video:** scrims or glass, WCAG AA contrast.
- **Build:** React, Tailwind, lucide icons; CSS animation and confetti only.
- **Tone:** confident and kind. Clothes only, never bodies. Label demo results as samples, and never fake scores.

## Screens
1. **Ready:**
   - Toolbar with mirror, switch camera, and sound.
   - Welcome "Show your fit."
   - Primary button: Enable camera → Connecting… → **Start fit check**.
   - "Try demo" link, and the note "Clips go to Gemini. Photos save to this browser."
   - Other states: "AI is not configured." and Camera Access Needed (Retry, or Launch Virtual Demo Feed).
2. **Countdown:** "Get ready", a huge 3-2-1-Go, and ✕ cancel.
3. **Runway (15s):**
   - "● Live", the seconds left, ✕, and a progress line.
   - A status pill, e.g. "Following your outfit · fresh feedback as you show more" or "Gemini quota reached. Live analysis is paused.".
   - Pose cue: Show your outfit → Try a turn → Show the details → Photos up next.
   - Chat at the bottom, a new comment every ~1s: username, a **Works well** or **Try this** badge, the text, an optional "Try: …" tip, and "Seen: Olive work jacket".
   - The clock starts only once clothing is recognised, so design a "looking for your outfit" moment.
4. **Posing:** "Photo 1/3" with the cue "Hold your pose" / "Try another angle" / "One last look", "Taken automatically", a big 3-2-1, a white flash. Error: "Camera not ready." + Restart countdown.
5. **Analyzing:** "Reviewing your look", "One outfit. Two perspectives.". Error: "Review paused" + Retry review / Back to camera.
6. **My looks feed:**
   - Header: wordmark, "New look ↗", "My looks · Saved on this browser."
   - Look card:
     - archetype title, date, and delete
     - a 4:5 carousel of 6 photos with n/6, arrows, thumbnails, and save
     - score line **Final 84.5/100 = (AI 88 + Rules 81) ÷ 2**
     - summary and post caption
     - a "Score breakdown +" expander: Fit & drape, 7–8 point method, Visual hierarchy, Color & weight continuity (each /100), styling points, fit gate, notes, garment features, top comments
   - Empty state: "Your next look starts here." + Open camera.
   - Demo looks labelled "Demo".
7. **Optional results reveal** before the feed: a big score, the archetype, the summary, garments, crowd quotes, and an editable caption with Copy and Share.

## Components
- **Chat row:** avatar, username, Works well (positive) or Try this (constructive) badge, text ≤220 chars, a tip line, and a garment chip.
- **Look card,** score line, sub-score bars, photo carousel, and garment row (category, description, colour, confidence).
- **Buttons:** primary, text, and 34–44px icon buttons. Pills: Live, timer, status.

## Sample
**Chat:**
- **Works well**: "The olive jacket gives the outfit a strong earthy layer."
- **Try this**: "The long jacket cuffs could use more definition." Try: rolling the cuffs once.

**Look:**
- **84.5**, **Modern Urban Minimalist**, "Structured charcoal jacket with light wash denim, an effortlessly clean silhouette."
- Garments:
  - Outerwear: Cropped Zip Jacket, Charcoal, 95%
  - Bottoms: Straight Leg Jeans, Light Wash, 92%
- Breakdown: Fit 86 · Points 75 · Hierarchy 80 · Continuity 83

## Direction
- **Current look:** quiet, near-monochrome (#101112, off-white button, Arial, "OKO //" wordmark). Replace freely.
- **Wanted:**
  - a distinctive identity
  - real energy in the runway (going live, last 3 seconds)
  - a satisfying photo shoot
  - a screenshot-worthy score reveal
  - a feed like a personal lookbook
- **Motion and accessibility:** respect reduced motion; touch targets ≥44px.

## Deliverables
- **Frames** at 390×844 and 1440×900: Ready (off, on, demo), Camera access, Countdown, Runway (searching, live, last 3s, paused), Posing (count, flash, error), Analyzing (loading, error), Results reveal, Feed (collapsed, expanded, empty).
- **Component sheet** and **tokens.**

**Out of scope:** accounts, real posting, backend.
