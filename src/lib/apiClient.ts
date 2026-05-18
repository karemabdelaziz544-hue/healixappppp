import { supabase } from './supabase';
import { logger } from './logger';
import * as Sentry from '@sentry/react-native';

const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds

export interface QueryOptions {
  timeoutMs?: number;
  retries?: number;
  isIdempotent?: boolean; // If true, sets default retries to 2. Else 0.
}

export async function executeQuery<T>(
  query: any, 
  options?: QueryOptions
): Promise<{ data: T | null; error: any }> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options?.retries ?? (options?.isIdempotent ? 2 : 0);
  
  let attempt = 0;
  
  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await query.abortSignal(controller.signal);
      clearTimeout(timeoutId);
      
      if (result.error) {
        throw result.error;
      }
      
      return { data: result.data as T, error: null };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      const isTimeout = error.name === 'AbortError' || error.message?.includes('AbortError');
      
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
