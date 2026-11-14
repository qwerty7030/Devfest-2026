// Unit tests only: no disk ledger and no real Gemini calls. Gate behavior has isolated clock-based tests.
process.env.NODE_ENV = 'test';
process.env.GEMINI_BUDGET_STORAGE = 'memory';
process.env.GEMINI_APP_REQUESTS_PER_MINUTE = '60';
