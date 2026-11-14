import type { CommentsResponse, OutfitComment, OutfitObservation } from '../../../lib/fitcheck/types';

const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
interface Queued { comment: OutfitComment; details: string; seenAt: number }

/** Session-local inventory survives turns and close-ups; no images or inventory are persisted. */
export class OutfitSession {
  private items = new Map<string, { item: OutfitObservation; seenAt: number }>();
  private counts = new Map<string, number>();
  private seenTexts = new Set<string>();
  private covered = new Set<string>();
  private pending: Queued[] = [];
  private recent: string[] = [];

  context() {
    return { knownItems: this.inventory(), coveredParts: [...this.items.keys()].map(id => ({ id, comments: this.counts.get(id) ?? 0 })), recent: this.recent.slice(-15) };
  }
  inventory() { return [...this.items.values()].map(v => v.item); }
  accept(data: CommentsResponse, now = Date.now()) {
    if (!data.person_visible || !Array.isArray(data.observations) || !data.observations.length) { this.pending = []; return false; }
    const visible = data.observations.filter(i => i && typeof i.id === 'string' && typeof i.description === 'string');
    for (const item of visible) this.items.set(item.id, { item, seenAt: now });
    for (const [id, value] of this.items) if (now - value.seenAt > 30_000) this.items.delete(id);
    while (this.items.size > 10) this.items.delete(this.items.keys().next().value!);
    const current = new Map(visible.map(i => [i.id, i]));
    for (const c of Array.isArray(data.comments) ? data.comments : []) {
      if (!c || typeof c.text !== 'string' || !c.text.trim() || !Array.isArray(c.evidenceIds)) continue;
      if (c.tone !== 'hype' && c.tone !== 'critique') continue;
      if (c.tone === 'critique' && (typeof c.suggestion !== 'string' || !c.suggestion.trim())) continue;
      const evidence = c.evidenceIds.flatMap(id => current.has(id) ? [current.get(id)!] : []);
      const key = normalize(c.text);
      const signature = this.signature(c);
      if (!evidence.length || this.seenTexts.has(key) || this.covered.has(signature) || this.pending.some(p => normalize(p.comment.text) === key || this.signature(p.comment) === signature)) continue;
      this.pending.push({ comment: c, details: evidence.map(i => i.description).join(' · '), seenAt: now });
    }
    this.pending = this.pending.filter(p => now - p.seenAt < 15_000).slice(-16);
    return visible.length > 0;
  }
  next(now = Date.now()) {
    this.pending = this.pending.filter(p => now - p.seenAt < 15_000);
    // Give newly discovered parts their first comment before repeating a familiar piece.
    this.pending.sort((a, b) => this.coverage(a.comment) - this.coverage(b.comment));
    const next = this.pending.shift();
    if (!next) return null;
    this.seenTexts.add(normalize(next.comment.text));
    this.covered.add(this.signature(next.comment));
    for (const id of next.comment.evidenceIds) this.counts.set(id, (this.counts.get(id) ?? 0) + 1);
    this.recent.push(next.comment.text);
    return next;
  }
  clearPending() { this.pending = []; }
  private coverage(c: OutfitComment) { return Math.min(...c.evidenceIds.map(id => this.counts.get(id) ?? 0)); }
  private signature(c: OutfitComment) { return `${[...c.evidenceIds].sort().join(',')}:${c.tone}:${c.aspect ?? 'detail'}`; }
}
