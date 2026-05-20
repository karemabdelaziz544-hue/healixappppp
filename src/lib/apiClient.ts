import { logger } from './logger';
import * as Sentry from '@sentry/react-native';
import { classifyError, shouldRetry, type AppError } from './errors';

const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds

export interface QueryOptions {
  timeoutMs?: number;
  retries?: number;
  isIdempotent?: boolean;
}

/** Typed result — replaces the old { data: T | null, error: any } contract */
export interface QueryResult<T> {
  data: T | null;
  error: AppError | null;
}

/**
 * SupabaseQuery — accepts any Supabase builder or plain Promise/PromiseLike.
 *
 * Why not use a strict Supabase generic type here?
 * `PostgrestFilterBuilder` implements `PromiseLike<T>` (has `.then`)
 * but not the full `Promise<T>` interface (missing `.catch`, `.finally`, `[Symbol.toStringTag]`).
 * Using `PromiseLike<unknown>` is the correct upper-bound type for both DB builders
 * and Storage/Function calls without needing `any`.
 */
type SupabaseQuery =
  | { abortSignal: (signal: AbortSignal) => PromiseLike<unknown> }
  | PromiseLike<unknown>;

/**
 * Wraps a PromiseLike with a timeout deadline.
 * Rejects with a typed message if the operation exceeds the deadline.
 */
function withTimeout<T>(thenable: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error('Request timed out')),
      ms
    );
    thenable.then(
      (val) => { clearTimeout(timeoutId); resolve(val); },
      (err) => { clearTimeout(timeoutId); reject(err); }
    );
  });
}

function hasAbortSignal(q: SupabaseQuery): q is { abortSignal: (s: AbortSignal) => PromiseLike<unknown> } {
  return typeof (q as any).abortSignal === 'function';
}

/**
 * executeQuery — Central data-access wrapper
 * ==========================================
 * Wraps Supabase DB builders, Storage calls, and Edge Function invocations
 * with: timeout, typed error classification, and smart retry policy.
 *
 * Retry policy matrix (replaces old generic flag-based retry):
 *  TIMEOUT / NETWORK / SERVER_ERROR / RATE_LIMITED → retry if idempotent
 *  AUTH_EXPIRED / FORBIDDEN / NOT_FOUND / VALIDATION → no retry ever
 *  Non-idempotent mutations: max 1 retry to avoid double-writes
 *
 * @param query  A Supabase QueryBuilder (implements PromiseLike + .abortSignal) or plain PromiseLike
 * @param options  timeout, max retries, idempotency hint
 */
export async function executeQuery<T>(
  query: SupabaseQuery,
  options?: QueryOptions
): Promise<QueryResult<T>> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options?.retries ?? (options?.isIdempotent ? 2 : 0);
  const isIdempotent = options?.isIdempotent ?? true;

  let attempt = 0;

  while (true) {
    try {
      let resultThenable: PromiseLike<unknown>;

      // Supabase DB builders expose .abortSignal() for cancellation.
      // Storage & Functions return plain PromiseLike — no abort support.
      if (hasAbortSignal(query)) {
        const controller = new AbortController();
        resultThenable = query.abortSignal(controller.signal);
      } else {
        resultThenable = query;
      }

      const result = await withTimeout(resultThenable, timeoutMs) as any;

      if (result?.error) {
        throw result.error;
      }

      // Storage & functions may return data directly or wrapped in { data }
      const data: T = result?.data !== undefined ? result.data : result;
      return { data, error: null };

    } catch (raw: unknown) {
      const appError = classifyError(raw);

      if (appError.code === 'TIMEOUT') {
        logger.warn(`[apiClient] Timeout on attempt ${attempt + 1}`);
      } else {
        logger.error(`[apiClient] ${appError.code}: ${appError.message}`);
      }

      if (shouldRetry(appError, attempt, maxRetries, isIdempotent)) {
        // Exponential backoff with jitter; rate-limit respects Retry-After
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 300;
        const delay = appError.code === 'RATE_LIMITED'
          ? ((appError as any).retryAfterMs ?? 5000) + jitter
          : baseDelay + jitter;

        await new Promise(res => setTimeout(res, delay));
        attempt++;
        continue;
      }

      // Final failure — report to Sentry with full classification context
      Sentry.captureException(raw instanceof Error ? raw : new Error(appError.message), {
        tags: { context: 'apiClient', errorCode: appError.code },
        extra: { attempt, appError },
      });

      return { data: null, error: appError };
    }
  }
}
