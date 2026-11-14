import type { CommentsResponse, OutfitComment, OutfitObservation } from './types';

const str = (v: unknown, max: number) => typeof v === 'string' ? v.trim().slice(0, max) : '';

/** Keep only comments linked to a visible item; never substitute canned outfit claims. */
export function sanitizeComments(raw: unknown): CommentsResponse {
  const empty: CommentsResponse = { person_visible: false, observations: [], comments: [] };
  if (!raw || typeof raw !== 'object') return empty;
  const o = raw as Record<string, unknown>;
  if (o.person_visible !== true) return empty;
  const observations: OutfitObservation[] = [];
  for (const item of Array.isArray(o.observations) ? o.observations : []) {
    if (!item || typeof item !== 'object') continue;
    const id = str(item.id, 30);
    const description = str(item.description, 160);
    if (!id || !description || observations.some(v => v.id === id)) continue;
    observations.push({ id, category: str(item.category, 40), description });
    if (observations.length >= 8) break;
  }
  if (!observations.length) return empty;
  const ids = new Set(observations.map(i => i.id));
  const comments: OutfitComment[] = [];
  for (const c of Array.isArray(o.comments) ? o.comments : []) {
    if (!c || typeof c !== 'object') continue;
    const text = str(c.text, 220);
    const evidenceIds: string[] = Array.isArray(c.evidenceIds) ? [...new Set<string>(c.evidenceIds.filter((id: unknown): id is string => typeof id === 'string' && ids.has(id)))] : [];
    const suggestion = str(c.suggestion, 180);
    if (!text || !evidenceIds.length || (c.tone !== 'hype' && c.tone !== 'critique')) continue;
    if (c.tone === 'critique' && !suggestion) continue;
    if (comments.some(v => v.text.toLowerCase() === text.toLowerCase())) continue;
    comments.push({ text, tone: c.tone, evidenceIds, suggestion: c.tone === 'critique' ? suggestion : '' });
    if (comments.length >= 8) break;
  }
  // Alternate praise and actionable criticism so both arrive early in a short session.
  const praise = comments.filter(c => c.tone === 'hype');
  const critique = comments.filter(c => c.tone === 'critique');
  const balanced: OutfitComment[] = [];
  while (praise.length || critique.length) {
    const p = praise.shift(); const c = critique.shift();
    if (p) balanced.push(p);
    if (c) balanced.push(c);
  }
  return { person_visible: true, observations, comments: balanced,
    vibe: str(o.vibe, 60) || undefined,
    rating: typeof o.rating === 'number' && Number.isFinite(o.rating) ? Math.round(Math.max(0, Math.min(10, o.rating)) * 10) / 10 : undefined };
}
