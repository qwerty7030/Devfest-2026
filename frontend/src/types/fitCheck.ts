export type AppState = 'READY' | 'COUNTDOWN' | 'RECORDING' | 'ANALYZING' | 'RESULTS';

export interface LiveComment {
  id: string;
  username: string;
  avatarUrl: string;
  comment: string;
  timestamp: number;
  badge?: string; // e.g. "VIP", "Stylist", "Verified"
  tag?: string;   // e.g. "Footwear", "Jacket", "Vibe"
  isHighlighted?: boolean;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  xOffsetPercent: number; // 0 to 100 relative to reaction container
  scale: number;          // 0.8 to 1.5
  durationSec: number;
}

export interface GarmentItem {
  category: 'Outerwear' | 'Tops' | 'Bottoms' | 'Footwear' | 'Accessories' | 'Overall Fit';
  description: string;
  color: string;
  confidence: number;
  highlight?: string;
}

export interface FitResult {
  overallScore: number;
  archetype: string;
  summary: string;
  garments: GarmentItem[];
  topComments: {
    username: string;
    comment: string;
    avatarUrl?: string;
  }[];
  capturedSnapshotUrl?: string;
  timestamp: number;
}

export type CoachingPhase = {
  phase: string;
  title: string;
  description: string;
  startSec: number;
  endSec: number;
  iconName: string;
};
