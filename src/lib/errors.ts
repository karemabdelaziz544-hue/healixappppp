/**
 * AppError — Typed discriminated union for all application errors
 * ==============================================================
 * Replace `error: any` in executeQuery and service layers.
 * Each variant carries enough context for retry decisions and Sentry enrichment.
 */

export type ErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'AUTH_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'VALIDATION'
  | 'UNKNOWN';

export interface TimeoutError {
  readonly code: 'TIMEOUT';
  readonly message: string;
  readonly retryable: true;
}

export interface NetworkError {
  readonly code: 'NETWORK';
  readonly message: string;
  readonly retryable: true;
}

export interface AuthExpiredError {
  readonly code: 'AUTH_EXPIRED';
  readonly message: string;
  readonly retryable: false; // Must re-authenticate — not a transient issue
}

export interface ForbiddenError {
  readonly code: 'FORBIDDEN';
  readonly message: string;
  readonly retryable: false;
}

export interface NotFoundError {
  readonly code: 'NOT_FOUND';
  readonly message: string;
  readonly retryable: false;
}

export interface RateLimitedError {
  readonly code: 'RATE_LIMITED';
  readonly message: string;
  readonly retryable: true;
  readonly retryAfterMs?: number; // From Retry-After header if available
}

export interface ServerError {
  readonly code: 'SERVER_ERROR';
  readonly message: string;
  readonly retryable: true;
  readonly statusCode: number;
}

export interface ValidationError {
  readonly code: 'VALIDATION';
  readonly message: string;
  readonly retryable: false;
  readonly fields?: Record<string, string>;
}

export interface UnknownError {
  readonly code: 'UNKNOWN';
  readonly message: string;
  readonly retryable: false;
  readonly original?: unknown;
}

export type AppError =
  | TimeoutError
  | NetworkError
  | AuthExpiredError
  | ForbiddenError
  | NotFoundError
  | RateLimitedError
  | ServerError
  | ValidationError
  | UnknownError;

/**
 * Classifies a raw caught error (from Supabase, network, or thrown strings)
 * into a typed AppError with a retry policy decision baked in.
 */
export function classifyError(err: unknown): AppError {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (msg.includes('timed out') || msg.includes('timeout') || err.name === 'AbortError') {
      return { code: 'TIMEOUT', message: err.message, retryable: true };
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
      return { code: 'NETWORK', message: err.message, retryable: true };
    }
    if (msg.includes('jwt') || msg.includes('auth') || msg.includes('401')) {
      return { code: 'AUTH_EXPIRED', message: err.message, retryable: false };
    }
    if (msg.includes('403') || msg.includes('forbidden') || msg.includes('rls')) {
      return { code: 'FORBIDDEN', message: err.message, retryable: false };
    }
    if (msg.includes('404') || msg.includes('not found')) {
      return { code: 'NOT_FOUND', message: err.message, retryable: false };
    }
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
      return { code: 'RATE_LIMITED', message: err.message, retryable: true };
    }
    if (msg.includes('500') || msg.includes('503') || msg.includes('server')) {
      return { code: 'SERVER_ERROR', message: err.message, retryable: true, statusCode: 500 };
    }
  }

  // Supabase PostgrestError shape: { code, message, details, hint }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const pgErr = err as { code?: string; message: unknown; details?: unknown; hint?: unknown };
    // Safely stringify — Supabase sometimes nests objects in .message
    const msg = typeof pgErr.message === 'string'
      ? pgErr.message
      : JSON.stringify(pgErr.message ?? pgErr);

    if (pgErr.code === 'PGRST301' || String(pgErr.code).startsWith('42')) {
      return { code: 'FORBIDDEN', message: msg, retryable: false };
    }
    if (pgErr.code === 'PGRST116') {
      return { code: 'NOT_FOUND', message: msg, retryable: false };
    }
    // Detect network/auth errors surfaced as Supabase error objects
    const msgLower = msg.toLowerCase();
    if (msgLower.includes('fetch') || msgLower.includes('network') || msgLower.includes('blob')) {
      return { code: 'NETWORK', message: msg, retryable: true };
    }
    if (msgLower.includes('jwt') || msgLower.includes('auth') || msgLower.includes('401')) {
      return { code: 'AUTH_EXPIRED', message: msg, retryable: false };
    }
    return { code: 'UNKNOWN', message: msg, retryable: false, original: err };
  }

  return {
    code: 'UNKNOWN',
    message: err instanceof Error ? err.message : String(err),
    retryable: false,
    original: err,
  };
}

/**
 * Determines whether a failed request attempt should be retried.
 * Takes into account: error type, attempt count, and idempotency.
 */
export function shouldRetry(
  error: AppError,
  attempt: number,
  maxRetries: number,
  isIdempotent: boolean
): boolean {
  if (attempt >= maxRetries) return false;
  if (!error.retryable) return false;
  // Only retry mutating operations (non-idempotent) once at most to avoid double-writes
  if (!isIdempotent && attempt >= 1) return false;
  return true;
}
