import { classifyError, shouldRetry } from '../src/lib/errors';

describe('errors — classifyError', () => {
  it('classifies timeout errors', () => {
    expect(classifyError(new Error('Request timed out')).code).toBe('TIMEOUT');
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    expect(classifyError(abortErr).code).toBe('TIMEOUT');
  });

  it('classifies network errors', () => {
    expect(classifyError(new Error('Network connection lost')).code).toBe('NETWORK');
    expect(classifyError(new Error('fetch failed')).code).toBe('NETWORK');
  });

  it('classifies auth errors', () => {
    expect(classifyError(new Error('JWT expired')).code).toBe('AUTH_EXPIRED');
    expect(classifyError(new Error('401 Unauthorized')).code).toBe('AUTH_EXPIRED');
  });

  it('classifies forbidden/RLS errors', () => {
    expect(classifyError(new Error('403 Forbidden')).code).toBe('FORBIDDEN');
    expect(classifyError(new Error('rls policy violated')).code).toBe('FORBIDDEN');
  });

  it('classifies rate limit errors', () => {
    expect(classifyError(new Error('429 Too Many Requests')).code).toBe('RATE_LIMITED');
    expect(classifyError(new Error('rate limit exceeded')).code).toBe('RATE_LIMITED');
  });

  it('classifies server errors', () => {
    expect(classifyError(new Error('500 Internal Server Error')).code).toBe('SERVER_ERROR');
    expect(classifyError(new Error('503 Service Unavailable')).code).toBe('SERVER_ERROR');
  });

  it('classifies Supabase PostgrestError objects', () => {
    const pgErr = { code: 'PGRST301', message: 'RLS policy' };
    expect(classifyError(pgErr).code).toBe('FORBIDDEN');
  });

  it('marks unknown errors as non-retryable', () => {
    const err = classifyError('some weird string error');
    expect(err.code).toBe('UNKNOWN');
    expect(err.retryable).toBe(false);
  });

  it('timeout and network are retryable', () => {
    expect(classifyError(new Error('Request timed out')).retryable).toBe(true);
    expect(classifyError(new Error('fetch failed')).retryable).toBe(true);
  });

  it('auth and forbidden are NOT retryable', () => {
    expect(classifyError(new Error('JWT expired')).retryable).toBe(false);
    expect(classifyError(new Error('403 Forbidden')).retryable).toBe(false);
  });
});

describe('errors — shouldRetry', () => {
  const networkErr = classifyError(new Error('Network connection lost'));
  const authErr = classifyError(new Error('JWT expired'));

  it('allows retry for retryable errors within limit', () => {
    expect(shouldRetry(networkErr, 0, 2, true)).toBe(true);
    expect(shouldRetry(networkErr, 1, 2, true)).toBe(true);
  });

  it('blocks retry when attempt >= maxRetries', () => {
    expect(shouldRetry(networkErr, 2, 2, true)).toBe(false);
    expect(shouldRetry(networkErr, 3, 2, true)).toBe(false);
  });

  it('blocks retry for non-retryable errors regardless of attempt', () => {
    expect(shouldRetry(authErr, 0, 5, true)).toBe(false);
  });

  it('limits non-idempotent mutations to 1 retry max', () => {
    expect(shouldRetry(networkErr, 0, 5, false)).toBe(true);  // First retry OK
    expect(shouldRetry(networkErr, 1, 5, false)).toBe(false); // Second retry blocked
  });
});
