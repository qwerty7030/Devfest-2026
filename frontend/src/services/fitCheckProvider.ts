import type { LiveComment, FitResult } from '../types/fitCheck';

export interface FitCheckProvider {
  /**
   * Begins streaming live audience comments and reaction bursts
   */
  startLiveFeed(
    onComment: (comment: LiveComment) => void,
    onReaction: (emoji: string) => void
  ): void;

  /**
   * Stops the live feed streaming
   */
  stopLiveFeed(): void;

  /**
   * Sends user-typed comment into the stream
   */
  sendUserComment(commentText: string): LiveComment;

  /**
   * Finalizes analysis and returns structured fit review (Gemini + LLM response)
   */
  analyzeFit(snapshotBase64?: string): Promise<FitResult>;
}
