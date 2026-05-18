import { logger } from './logger';
import * as Sentry from '@sentry/react-native';

const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds

export interface QueryOptions {
  timeoutMs?: number;
  retries?: number;
  isIdempotent?: boolean; // If true, sets default retries to 2. Else 0.
}

/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't resolve in time.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('Request timed out')), ms);
    promise.then(
      (val) => { clearTimeout(timeoutId); resolve(val); },
      (err) => { clearTimeout(timeoutId); reject(err); }
    );
  });
}

export async function executeQuery<T>(
  query: any, 
  options?: QueryOptions
): Promise<{ data: T | null; error: any }> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options?.retries ?? (options?.isIdempotent ? 2 : 0);
  
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      let resultPromise: Promise<any>;

      // Database query builders expose .abortSignal(); Storage & Functions return plain Promises.
      // We detect which case we're in and handle accordingly.
      if (typeof query?.abortSignal === 'function') {
        const controller = new AbortController();
        resultPromise = withTimeout(query.abortSignal(controller.signal), timeoutMs);
      } else {
        // query is already a Promise (storage.upload, functions.invoke, etc.)
        resultPromise = withTimeout(Promise.resolve(query), timeoutMs);
      }

      const result = await resultPromise;
      
      if (result?.error) {
        throw result.error;
      }
      
      // Storage & functions return { data, error } or just data directly
      return { data: (result?.data !== undefined ? result.data : result) as T, error: null };
    } catch (error: any) {
      const isTimeout = error.message === 'Request timed out' || error.name === 'AbortError';
      
      if (isTimeout) {
        logger.warn(`Request timed out on attempt ${attempt + 1}`);
      } else {
        logger.error(`Supabase Query Error: ${error.message || JSON.stringify(error)}`);
      }
      
      if (attempt >= retries) {
        Sentry.captureException(error, { 
          tags: { context: 'apiClient' },
          extra: { attempt, isTimeout, errorDetails: error } 
        });
        return { data: null, error };
      }
      
      // Exponential backoff: 1s, 2s, 4s...
      const backoffDelay = Math.pow(2, attempt) * 1000;
      await new Promise(res => setTimeout(res, backoffDelay));
      attempt++;
    }
  }
  
  return { data: null, error: new Error('Max retries reached') };
}
