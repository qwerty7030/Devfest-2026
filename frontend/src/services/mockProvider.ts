import type { FitCheckProvider } from './fitCheckProvider';
import type { LiveComment, FitResult } from '../types/fitCheck';

export const MOCK_USERS = [
  {
    username: 'kai_cenat_fan',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    badge: 'VIP',
  },
  {
    username: 'mia.styles',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    badge: 'Stylist',
  },
  {
    username: 'hypebeast_marcus',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    badge: 'Verified',
  },
  {
    username: 'sara_vogue',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80',
    badge: 'Trendsetter',
  },
  {
    username: 'dripcheck_official',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80',
    badge: 'Critic',
  },
  {
    username: 'vintage_hunter_alex',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
  {
    username: 'zoe_grails',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    badge: 'Stylist',
  },
  {
    username: 'noah_kicks',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
  },
  {
    username: 'chloe.fits',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
  },
  {
    username: 'streetwear_jake',
    avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&auto=format&fit=crop&q=80',
  },
];

const PHASE_COMMENTS: Record<string, string[]> = {
  intro: [
    'Wait hold on this is clean 🔥🔥',
    'OKAYYY LET THEM COOK 👨‍🍳',
    'The fit is fitting fr fr',
    'Bro stepped out today!!',
    'W fit alert 🚨🚨',
    'Sheeeeesh the proportions',
    'Silhouette is already looking elite',
    'Wait this color palette?? Yes please',
  ],
  turn: [
    'The jacket drape on the turn is INSANE 🤌',
    'Turn around again!!',
    'The back profile goes crazy',
    'Look at that boxy cut omg',
    'Texture contrast between top & pants is crazy',
    'Bro definitely curated this last night',
    'Fabric weight looks so high quality 🧶',
    'Cleanest silhouette on my FYP today',
  ],
  details: [
    'WHAT ARE THOSE KICKS THO 🔥👟',
    'Are those vintage runners??',
    'Need the ID on the trousers expeditiously',
    'The jewelry accents tie it all together ✨',
    'The pants break over the shoes is immaculate',
    'Pants stacking is 10/10 perfection',
    'Color theory masterclass right here',
    'Understated accessories are so tasteful',
  ],
  outro: [
    'EASY 9.6/10 🔥🔥🔥',
    'Certified drip approved ✅',
    'Bro is HIM',
    'Straight to the Pinterest moodboard',
    'Post this to IG immediately!',
    'DevFest best dressed undisputed 🏆',
    'Outfit of the year contender',
    'No notes, pure fire 🙌',
  ],
};

const SAMPLE_ARCHETYPES = [
  {
    archetype: 'Neo-Streetwear Minimalist',
    score: 95,
    summary: 'A masterclass in proportions. Cropped boxy outerwear paired with relaxed pleated tailoring and understated retro kicks creates an effortless silhouette with high aesthetic harmony.',
    garments: [
      {
        category: 'Outerwear' as const,
        description: 'Boxy Cropped Canvas Work Jacket',
        color: 'Washed Olive / Sage',
        confidence: 0.98,
        highlight: 'Immaculate cropped drape',
      },
      {
        category: 'Tops' as const,
        description: 'Heavyweight Drop-Shoulder Relaxed Tee',
        color: 'Off-White / Cream',
        confidence: 0.94,
        highlight: 'Heavyweight collar structure',
      },
      {
        category: 'Bottoms' as const,
        description: 'Wide-Leg Pleated Tailored Trousers',
        color: 'Deep Charcoal / Slate',
        confidence: 0.97,
        highlight: 'Perfect shoe break',
      },
      {
        category: 'Footwear' as const,
        description: 'Retro Low-Profile Leather Trainers',
        color: 'Chalk White / Gum Sole',
        confidence: 0.93,
        highlight: 'Classic silhouette',
      },
      {
        category: 'Accessories' as const,
        description: 'Silver Cuban Chain & Leather Crossbody',
        color: 'Brushed Silver',
        confidence: 0.89,
        highlight: 'Subtle metal accent',
      },
    ],
  },
  {
    archetype: 'Modern Japanese Utility',
    score: 93,
    summary: 'Functional elegance meets contemporary street tailoring. Earthy olive and stone tones balanced with tactical detailing and clean footwear.',
    garments: [
      {
        category: 'Outerwear' as const,
        description: 'Oversized Technical Windbreaker',
        color: 'Slate Charcoal',
        confidence: 0.96,
        highlight: 'Subtle matte sheen',
      },
      {
        category: 'Tops' as const,
        description: 'Layered Waffle Knit Thermal',
        color: 'Oatmeal',
        confidence: 0.91,
        highlight: 'Textural depth',
      },
      {
        category: 'Bottoms' as const,
        description: 'Relaxed Balloon Cargo Trousers',
        color: 'Army Olive',
        confidence: 0.95,
        highlight: 'Structured volume',
      },
      {
        category: 'Footwear' as const,
        description: 'Technical GORE-TEX Trail Runners',
        color: 'Triple Black',
        confidence: 0.92,
        highlight: 'Rugged aesthetic',
      },
    ],
  },
];

export class MockFitCheckProvider implements FitCheckProvider {
  private commentTimer: number | null = null;
  private reactionTimer: number | null = null;
  private startTime: number = 0;
  private onCommentCallback: ((comment: LiveComment) => void) | null = null;
  private onReactionCallback: ((emoji: string) => void) | null = null;

  public startLiveFeed(
    onComment: (comment: LiveComment) => void,
    onReaction: (emoji: string) => void
  ): void {
    this.onCommentCallback = onComment;
    this.onReactionCallback = onReaction;
    this.startTime = Date.now();

    // Trigger initial comments rapidly
    this.scheduleNextComment();
    this.scheduleNextReaction();
  }

  public stopLiveFeed(): void {
    if (this.commentTimer) {
      window.clearTimeout(this.commentTimer);
      this.commentTimer = null;
    }
    if (this.reactionTimer) {
      window.clearTimeout(this.reactionTimer);
      this.reactionTimer = null;
    }
    this.onCommentCallback = null;
    this.onReactionCallback = null;
  }

  private scheduleNextComment() {
    if (!this.onCommentCallback) return;

    // Comments stream at realistic staggered intervals (every 400ms to 900ms)
    const delay = Math.floor(Math.random() * 500) + 400;
    this.commentTimer = window.setTimeout(() => {
      if (!this.onCommentCallback) return;

      const elapsedSec = (Date.now() - this.startTime) / 1000;
      let phase = 'intro';
      if (elapsedSec > 11) phase = 'outro';
      else if (elapsedSec > 7) phase = 'details';
      else if (elapsedSec > 3.5) phase = 'turn';

      const pool = PHASE_COMMENTS[phase] || PHASE_COMMENTS.intro;
      const commentText = pool[Math.floor(Math.random() * pool.length)];
      const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];

      const comment: LiveComment = {
        id: 'cmt_' + Math.random().toString(36).substring(2, 9),
        username: user.username,
        avatarUrl: user.avatar,
        badge: user.badge,
        comment: commentText,
        timestamp: Date.now(),
        isHighlighted: Math.random() > 0.85,
      };

      this.onCommentCallback(comment);
      this.scheduleNextComment();
    }, delay);
  }

  private scheduleNextReaction() {
    if (!this.onReactionCallback) return;

    const delay = Math.floor(Math.random() * 350) + 200;
    this.reactionTimer = window.setTimeout(() => {
      if (!this.onReactionCallback) return;

      const emojis = ['❤️', '🔥', '👏', '✨', '💯', '😍', '👀'];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      this.onReactionCallback(emoji);

      this.scheduleNextReaction();
    }, delay);
  }

  public sendUserComment(commentText: string): LiveComment {
    const userComment: LiveComment = {
      id: 'usr_' + Date.now(),
      username: 'you',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      badge: 'Host',
      comment: commentText,
      timestamp: Date.now(),
      isHighlighted: true,
    };
    return userComment;
  }

  public async analyzeFit(snapshotBase64?: string): Promise<FitResult> {
    // Simulate Gemini Vision processing latency (1.8 - 2.2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const selectedArchetype = SAMPLE_ARCHETYPES[Math.floor(Math.random() * SAMPLE_ARCHETYPES.length)];

    return {
      overallScore: selectedArchetype.score,
      archetype: selectedArchetype.archetype,
      summary: selectedArchetype.summary,
      garments: selectedArchetype.garments,
      topComments: [
        {
          username: 'mia.styles',
          comment: 'The jacket drape is absolute perfection on the turn! 🤌',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
        },
        {
          username: 'hypebeast_marcus',
          comment: 'Pants break over the kicks is 10/10 no notes 🔥',
          avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
        },
        {
          username: 'sara_vogue',
          comment: 'Subtle earth tone harmony, very high taste level ✨',
          avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80',
        },
      ],
      capturedSnapshotUrl: snapshotBase64,
      timestamp: Date.now(),
    };
  }
}

export const mockFitCheckProvider = new MockFitCheckProvider();
