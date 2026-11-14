export type AppState = 'READY' | 'COUNTDOWN' | 'RECORDING' | 'ANALYZING' | 'POSING' | 'RESULTS';

export interface LiveComment {
  id: string;
  username: string;
  avatarUrl: string;
  comment: string;
  timestamp: number;
  badge?: string; // e.g. "VIP", "Stylist", "Verified"
  tag?: string;   // e.g. "Footwear", "Jacket", "Vibe"
  isHighlighted?: boolean;
  feedbackType?: 'compliment' | 'suggestion';
  suggestion?: string;
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
  tagXPercent?: number; // Placement percentage for interactive outfit tags on photo
  tagYPercent?: number;
}

export interface FitResult {
  source?: 'ai' | 'demo';
  overallScore: number;
  archetype: string;
  summary: string;
  caption: string;
  likesCount: number;
  garments: GarmentItem[];
  topComments: {
    id: string;
    username: string;
    comment: string;
    avatarUrl: string;
    badge?: string;
    timeAgo: string;
    likes: number;
  }[];
  capturedPhotos: string[];
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
