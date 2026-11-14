import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync, renameSync, unlinkSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ApiError } from './validation';
import { pacificDay, quotaFailure } from './quota';

type Kind = 'live' | 'report';
interface State {
  version: 1; day: string; dailyCalls: number; calls: number[]; lastCall: number;
  active: { id: string; until: number } | null;
  blocked: Record<string, { until: number; code: string; message: string }>;
  sessions: Record<string, { live: number; report: number; touched: number }>;
}
const fresh = (): State => ({ version: 1, day: '', dailyCalls: 0, calls: [], lastCall: -Infinity, active: null, blocked: {}, sessions: {} });
export interface BudgetStore { update<T>(work: (state: State) => T): T }
export class MemoryBudgetStore implements BudgetStore {
  private state = fresh();
  update<T>(work: (state: State) => T) { return work(this.state); }
}

/** A small locked ledger shares counters across local servers and survives restarts. No keys or media are written. */
export class FileBudgetStore implements BudgetStore {
  constructor(private directory: string) {}
  update<T>(work: (state: State) => T): T {
    mkdirSync(this.directory, { recursive: true });
    const lock = join(this.directory, 'budget.lock');
    const file = join(this.directory, 'budget.json');
    let handle: number;
    try {
      if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs > 5000) unlinkSync(lock);
      handle = openSync(lock, 'wx');
    } catch { throw new ApiError('Another request is updating the usage counter. Wait a moment.', 429, 'APP_COOLDOWN', 1); }
    try {
      const state: State = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fresh();
      if (state.version !== 1 || !Array.isArray(state.calls) || !state.sessions || !state.blocked) throw new Error('Invalid budget ledger');
      // JSON cannot represent -Infinity; null is treated as an unused initial slot.
      if (state.lastCall === null) state.lastCall = -Infinity;
      const result = work(state);
      const temporary = join(this.directory, 'budget.tmp');
      writeFileSync(temporary, JSON.stringify(state)); renameSync(temporary, file);
      return result;
    } finally { closeSync(handle); unlinkSync(lock); }
  }
}

export class RequestBudget {
  constructor(private store: BudgetStore, private options = { perMinute: 4, perDay: 100, minGapMs: 10_000 }) {}
  acquire(sessionId: string, kind: Kind, requestId: string, model: string, now = Date.now()) {
    this.store.update(state => {
      for (const [id, session] of Object.entries(state.sessions)) if (now - session.touched > 30 * 60_000) delete state.sessions[id];
      if (state.day !== pacificDay(now)) { state.day = pacificDay(now); state.dailyCalls = 0; }
      const blocked = state.blocked[model];
      if (blocked?.until > now) throw new ApiError(blocked.message, 429, blocked.code, Math.ceil((blocked.until - now) / 1000));
      const session = state.sessions[sessionId] ?? { live: 0, report: 0, touched: now };
      if (session[kind] >= (kind === 'live' ? 2 : 1)) throw new ApiError('This fit check has used its analysis budget. Start a new fit check for another review.', 429, 'SESSION_BUDGET_REACHED');
      state.calls = state.calls.filter(t => now - t < 60_000);
      if (state.dailyCalls >= this.options.perDay) throw new ApiError('The app’s daily request budget has been reached. AI calls are paused for today.', 429, 'APP_DAILY_BUDGET');
      const waitUntil = Math.max(state.lastCall + this.options.minGapMs,
        state.active && state.active.until > now ? state.active.until : 0,
        state.calls.length >= this.options.perMinute ? state.calls[0] + 60_000 : 0);
      if (waitUntil > now) throw new ApiError(`Cooling down before the next AI request. Wait ${Math.ceil((waitUntil - now) / 1000)} seconds.`, 429, 'APP_COOLDOWN', Math.ceil((waitUntil - now) / 1000));
      session[kind]++; session.touched = now; state.sessions[sessionId] = session;
      state.calls.push(now); state.lastCall = now; state.dailyCalls++;
      state.active = { id: requestId, until: now + 30_000 };
    });
  }
  release(requestId: string) { this.store.update(state => { if (state.active?.id === requestId) state.active = null; }); }
  providerFailed(model: string, error: unknown, now = Date.now()) {
    const failure = quotaFailure(error, now);
    if (failure) this.store.update(state => { state.blocked[model] = { until: now + failure.retryAfterSeconds * 1000, code: failure.code, message: failure.message }; });
  }
}

const globalBudget = globalThis as typeof globalThis & { fitcheckBudget?: RequestBudget };
export function requestBudget() {
  if (!globalBudget.fitcheckBudget) {
    const number = (name: string, fallback: number) => Math.max(0, Number(process.env[name]) || fallback);
    const memory = process.env.GEMINI_BUDGET_STORAGE === 'memory';
    globalBudget.fitcheckBudget = new RequestBudget(memory ? new MemoryBudgetStore() : new FileBudgetStore(join(process.cwd(), 'data', '.runtime')), {
      perMinute: number('GEMINI_APP_REQUESTS_PER_MINUTE', 4), perDay: number('GEMINI_APP_REQUESTS_PER_DAY', 100),
      minGapMs: memory && process.env.NODE_ENV === 'test' ? 0 : 10_000,
    });
  }
  return globalBudget.fitcheckBudget;
}
