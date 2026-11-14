import type { FitCheckProvider } from './fitCheckProvider';
import { mockFitCheckProvider } from './mockProvider';
import { geminiFitCheckProvider } from './geminiProvider';

/**
 * The provider the app uses. Real Gemini backend by default;
 * run `VITE_USE_MOCK=1 npm run dev` to go back to the canned mock.
 */
export const fitCheckProvider: FitCheckProvider =
  import.meta.env.VITE_USE_MOCK === '1' ? mockFitCheckProvider : geminiFitCheckProvider;
