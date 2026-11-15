import type { Fit } from "./fitSchema";
import type { RefObject } from "react";

/**
 * EMPTY   – nobody in frame
 * ENTERED – person just detected; local hype is showing, first AI call in flight
 * LIVE    – AI comments are flowing
 * LEFT    – person walked out; `lastResult` holds the final rating for the end card
 */
export type LiveState = "EMPTY" | "ENTERED" | "LIVE" | "LEFT";

export type Tone = "hype" | "roast" | "question" | "emoji";

export interface LiveComment {
  id: string;
  username: string;
  /** Stable seed for generating an avatar (e.g. a gradient or initials). */
  avatarSeed: string;
  text: string;
  tone: Tone;
  /** "ai" = written by Gemini about the current outfit, "local" = canned filler. */
  source: "ai" | "local";
}

export interface FitResult {
  /** 0–10 */
  rating: number;
  /** Short label, e.g. "y2k street", "old money" */
  vibe: string;
}

/** Everything the UI needs. Returned by both the real and the mock hook. */
export interface FitCheckLive {
  /** Attach to the UI's <video autoPlay playsInline muted /> element. */
  videoRef: RefObject<HTMLVideoElement | null>;
  state: LiveState;
  /** Most recent comments, oldest first, newest last (max ~30). */
  comments: LiveComment[];
  viewerCount: number;
  /** Latest rating from Gemini; persists through LEFT so the end card can show it. */
  lastResult: FitResult | null;
  /** Camera / detector problems worth showing to the user, else null. */
  error: string | null;
  /** Pretend someone walked in (spacebar does this too). */
  forceEnter: () => void;
  /** Back to EMPTY and clear everything (Esc does this too). */
  reset: () => void;
}

// ---- API contract: POST /api/comments ----

export interface CommentsRequest {
  /** JPEG, base64 without the data: prefix. */
  frame: string;
  /** Recently shown AI comments, so Gemini doesn't repeat itself. */
  recent: string[];
}

/** Matches the categories the frontend's LiveComment.tag / GarmentItem use. */
export type CommentTag = "Outerwear" | "Tops" | "Bottoms" | "Footwear" | "Accessories" | "Vibe";

export interface CommentsResponse {
  person_visible: boolean;
  vibe?: string;
  rating?: number;
  comments: { text: string; tone: Tone; tag?: CommentTag }[];
  /** Results-card data for this frame (only when person_visible). */
  fit?: Fit;
  /** Set when every model is rate-limited: don't call again for this long. */
  retryAfterMs?: number;
}
