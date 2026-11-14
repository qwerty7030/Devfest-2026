export interface QuotaFailure { code: 'AI_RATE_LIMITED' | 'AI_DAILY_QUOTA_EXHAUSTED'; message: string; retryAfterSeconds: number }

export function pacificDay(now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function secondsUntilPacificMidnight(now = Date.now()) {
  const [year, month, day] = pacificDay(now).split('-').map(Number);
  const midnight = Date.UTC(year, month - 1, day + 1);
  let candidate = midnight + 8 * 3600_000;
  for (let i = 0; i < 2; i++) {
    const offset = new Intl.DateTimeFormat('en', { timeZone: 'America/Los_Angeles', timeZoneName: 'longOffset' }).formatToParts(candidate).find(p => p.type === 'timeZoneName')!.value.match(/GMT([+-])(\d{2}):(\d{2})/)!;
    const ms = (Number(offset[2]) * 60 + Number(offset[3])) * 60_000 * (offset[1] === '-' ? -1 : 1);
    candidate = midnight - ms;
  }
  return Math.max(1, Math.ceil((candidate - now) / 1000));
}

/** Google's 429 can mean a minute-level cooldown OR a daily limit; do not conflate them. */
export function quotaFailure(error: unknown, now = Date.now()): QuotaFailure | null {
  if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 429) return null;
  const message = error instanceof Error ? error.message : '';
  const daily = /perday|per.day|requests.per.day|tokens.per.day/i.test(message);
  const delay = message.match(/"retryDelay"\s*:\s*"([\d.]+)s"/);
  const retryAfterSeconds = daily
    ? Math.max(secondsUntilPacificMidnight(now), Math.ceil(Number(delay?.[1] ?? 0)))
    : Math.max(60, Math.ceil(Number(delay?.[1] ?? 60)));
  return { code: daily ? 'AI_DAILY_QUOTA_EXHAUSTED' : 'AI_RATE_LIMITED', retryAfterSeconds,
    message: daily ? 'Gemini’s daily project quota is exhausted. Wait for the daily reset; retrying this session cannot fix it.'
      : `Gemini needs a cooldown. Wait ${retryAfterSeconds} seconds before another fit check.` };
}
