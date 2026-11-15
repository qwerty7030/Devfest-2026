import type { FitResult } from '../types/fitCheck';
export type ScoreRecord = Pick<FitResult, 'overallScore' | 'aiScore' | 'rulesScore' | 'rules' | 'archetype' | 'timestamp' | 'source' | 'streamComments'> & { id: string; version: 1 };
/** Explicit allowlist: never spread a photo-bearing FitResult into Firestore. */
export function scoreRecord(post: FitResult & { id: string }): ScoreRecord {
  const record: ScoreRecord = { version: 1, id: post.id, overallScore: post.overallScore,
    archetype: post.archetype.slice(0, 60), timestamp: post.timestamp, source: post.source ?? 'ai' };
  if (post.aiScore !== undefined) record.aiScore = post.aiScore;
  if (post.rulesScore !== undefined) record.rulesScore = post.rulesScore;
  if (post.streamComments?.length) record.streamComments = post.streamComments.slice(0, 6).map(c => ({
    text: c.text.slice(0, 220), feedbackType: c.feedbackType,
    ...(c.suggestion ? { suggestion: c.suggestion.slice(0, 180) } : {}),
  }));
  if (post.rules) record.rules = {
    totalScore: post.rules.totalScore, fitScore: post.rules.fitScore, pointsScore: post.rules.pointsScore,
    hierarchyScore: post.rules.hierarchyScore, continuityScore: post.rules.continuityScore,
    fitGateMultiplier: post.rules.fitGateMultiplier, totalPoints: post.rules.totalPoints,
    notes: post.rules.notes.slice(0, 8).map(n => n.slice(0, 220)),
  };
  return record;
}
