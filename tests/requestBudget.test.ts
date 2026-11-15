import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { RequestBudget, MemoryBudgetStore, FileBudgetStore } from '../lib/fitcheck/requestBudget';
import { ApiError } from '../lib/fitcheck/validation';
import { quotaFailure, secondsUntilPacificMidnight } from '../lib/fitcheck/quota';

const start = Date.parse('2026-11-14T20:00:00Z');
const relaxed = { perMinute: 60, perDay: 100, minGapMs: 0 };

test('each session permits only two live provider attempts and one final report', () => {
  const budget = new RequestBudget(new MemoryBudgetStore(), relaxed);
  for (let i = 0; i < 2; i++) { budget.acquire('session', 'live', `live-${i}`, 'model', start + i); budget.release(`live-${i}`); }
  assert.throws(() => budget.acquire('session', 'live', 'extra', 'model', start + 3), (e: unknown) => e instanceof ApiError && e.code === 'SESSION_BUDGET_REACHED');
  budget.acquire('session', 'report', 'report', 'model', start + 4); budget.release('report');
  assert.throws(() => budget.acquire('session', 'report', 'extra-report', 'model', start + 5), (e: unknown) => e instanceof ApiError && e.code === 'SESSION_BUDGET_REACHED');
});

test('all sessions share the four-per-minute cap and ten-second minimum gap', () => {
  const budget = new RequestBudget(new MemoryBudgetStore());
  budget.acquire('first', 'live', 'one', 'model', start); budget.release('one');
  assert.throws(() => budget.acquire('second', 'live', 'too-fast', 'model', start + 1000), (e: unknown) => e instanceof ApiError && e.retryAfterSeconds === 9);
  for (let i = 1; i < 4; i++) { budget.acquire(`session${i}`, 'live', `request${i}`, 'model', start + i * 10_000); budget.release(`request${i}`); }
  assert.throws(() => budget.acquire('fifth', 'live', 'fifth', 'model', start + 40_000), (e: unknown) => e instanceof ApiError && e.code === 'APP_COOLDOWN' && e.retryAfterSeconds === 20);
  budget.acquire('later', 'live', 'later', 'model', start + 60_000); budget.release('later');
});

test('an in-flight lease prevents overlapping model calls across sessions', () => {
  const budget = new RequestBudget(new MemoryBudgetStore(), relaxed);
  budget.acquire('one', 'live', 'first', 'model', start);
  assert.throws(() => budget.acquire('two', 'live', 'second', 'model', start + 1000), ApiError);
  budget.release('first'); budget.acquire('two', 'live', 'second', 'model', start + 1001);
});

test('the app daily budget counts attempted requests and resets on the Pacific calendar day', () => {
  const budget = new RequestBudget(new MemoryBudgetStore(), { ...relaxed, perDay: 2 });
  for (let i = 0; i < 2; i++) { budget.acquire(`session${i}`, 'live', `request${i}`, 'model', start + i); budget.release(`request${i}`); }
  assert.throws(() => budget.acquire('three', 'live', 'three', 'model', start + 2), (e: unknown) => e instanceof ApiError && e.code === 'APP_DAILY_BUDGET');
  budget.acquire('tomorrow', 'live', 'next-day', 'model', Date.parse('2026-11-15T08:00:00Z'));
});

test('provider quota failures block subsequent requests before they reach Google', () => {
  const budget = new RequestBudget(new MemoryBudgetStore(), relaxed);
  const error = Object.assign(new Error('{"quotaId":"GenerateRequestsPerMinutePerProject","retryDelay":"65s"}'), { status: 429 });
  budget.providerFailed('model', error, start);
  assert.throws(() => budget.acquire('new-session', 'live', 'new-request', 'model', start + 1000), (e: unknown) => e instanceof ApiError && e.code === 'AI_RATE_LIMITED' && e.retryAfterSeconds === 64);
  budget.acquire('later', 'live', 'later', 'model', start + 65_000);
});

test('the locked ledger shares usage across server instances and restarts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'fitcheck-budget-'));
  try {
    const first = new RequestBudget(new FileBudgetStore(directory));
    first.acquire('session', 'live', 'request', 'model', start); first.release('request');
    const restarted = new RequestBudget(new FileBudgetStore(directory));
    assert.throws(() => restarted.acquire('another-session', 'live', 'second', 'model', start + 1000), (e: unknown) => e instanceof ApiError && e.code === 'APP_COOLDOWN');
    restarted.acquire('another-session', 'live', 'second', 'model', start + 10_000); restarted.release('second');
  } finally { unlinkSync(join(directory, 'budget.json')); rmdirSync(directory); }
});

test('an explicit model change leaves shared usage intact without inheriting another model cooldown', () => {
  const budget = new RequestBudget(new MemoryBudgetStore(), { ...relaxed, perDay: 2 });
  budget.acquire('first', 'live', 'old-call', 'old-model', start); budget.release('old-call');
  budget.providerFailed('old-model', Object.assign(new Error('{"quotaId":"GenerateRequestsPerDayPerProject"}'), { status: 429 }), start);
  assert.throws(() => budget.acquire('blocked', 'live', 'blocked', 'old-model', start + 1), (e: unknown) => e instanceof ApiError && e.code === 'AI_DAILY_QUOTA_EXHAUSTED');
  budget.acquire('second', 'live', 'new-call', 'gemini-3.1-flash-lite', start + 2); budget.release('new-call');
  assert.throws(() => budget.acquire('third', 'live', 'extra', 'gemini-3.1-flash-lite', start + 3), (e: unknown) => e instanceof ApiError && e.code === 'APP_DAILY_BUDGET');
});

test('daily and minute quota errors have different recovery times, including daylight saving time', () => {
  const minute = quotaFailure(Object.assign(new Error('{"quotaId":"RequestsPerMinute","retryDelay":"12s"}'), { status: 429 }), start)!;
  const daily = quotaFailure(Object.assign(new Error('{"quotaId":"GenerateRequestsPerDayPerProject","retryDelay":"12s"}'), { status: 429 }), start)!;
  assert.equal(minute.code, 'AI_RATE_LIMITED'); assert.equal(minute.retryAfterSeconds, 60);
  assert.equal(daily.code, 'AI_DAILY_QUOTA_EXHAUSTED'); assert.ok(daily.retryAfterSeconds > 3600);
  assert.equal(secondsUntilPacificMidnight(Date.parse('2026-11-15T07:59:00Z')), 60);
  assert.equal(secondsUntilPacificMidnight(Date.parse('2026-07-15T06:59:00Z')), 60);
});
