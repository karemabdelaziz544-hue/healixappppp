import { executeQuery } from '../src/lib/apiClient';

// Mock Sentry so it doesn't throw in test environment
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Mock logger to keep test output clean
jest.mock('../src/lib/logger', () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

describe('apiClient — executeQuery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ─── Happy path ───────────────────────────────────────────────────
  it('returns data on successful DB query (abortSignal path)', async () => {
    const mockQuery = {
      abortSignal: jest.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
    };
    const { data, error } = await executeQuery(mockQuery);
    expect(error).toBeNull();
    expect(data).toEqual({ id: '1' });
  });

  it('returns data on successful plain Promise (Storage/Functions path)', async () => {
    const mockPromise = Promise.resolve({ data: 'uploaded', error: null });
    const { data, error } = await executeQuery(mockPromise as any);
    expect(error).toBeNull();
    expect(data).toBe('uploaded');
  });

  // ─── Retry policy ─────────────────────────────────────────────────
  it('retries on network error when isIdempotent=true, then succeeds', async () => {
    const mockQuery = {
      abortSignal: jest.fn()
        .mockRejectedValueOnce(new Error('Network connection lost'))
        .mockResolvedValueOnce({ data: { success: true }, error: null }),
    };
    // Run with retries — use fake timers to skip backoff delay
    const promise = executeQuery(mockQuery, { isIdempotent: true, retries: 1 });
    // Advance all pending timers (backoff delay) without real waiting
    await jest.runAllTimersAsync();
    const { data, error } = await promise;
    expect(error).toBeNull();
    expect(data).toEqual({ success: true });
    expect(mockQuery.abortSignal).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on AUTH_EXPIRED error (non-retryable)', async () => {
    const mockQuery = {
      abortSignal: jest.fn().mockRejectedValue(new Error('JWT expired')),
    };
    const { data, error } = await executeQuery(mockQuery, { isIdempotent: true, retries: 3 });
    expect(data).toBeNull();
    expect(error?.code).toBe('AUTH_EXPIRED');
    // Should only have been called once — no retries on auth errors
    expect(mockQuery.abortSignal).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on FORBIDDEN error (RLS policy)', async () => {
    const mockQuery = {
      abortSignal: jest.fn().mockRejectedValue(new Error('403 Forbidden')),
    };
    const { data, error } = await executeQuery(mockQuery, { isIdempotent: true, retries: 3 });
    expect(error?.code).toBe('FORBIDDEN');
    expect(mockQuery.abortSignal).toHaveBeenCalledTimes(1);
  });

  it('classifies timeout error correctly', async () => {
    const mockQuery = {
      abortSignal: jest.fn().mockRejectedValue(new Error('Request timed out')),
    };
    const { error } = await executeQuery(mockQuery, { retries: 0 });
    expect(error?.code).toBe('TIMEOUT');
    expect(error?.retryable).toBe(true);
  });

  it('classifies rate-limit error correctly', async () => {
    const mockQuery = {
      abortSignal: jest.fn().mockRejectedValue(new Error('429 Too Many Requests')),
    };
    const { error } = await executeQuery(mockQuery, { retries: 0 });
    expect(error?.code).toBe('RATE_LIMITED');
    expect(error?.retryable).toBe(true);
  });

  it('does not retry non-idempotent mutations more than once', async () => {
    const mockQuery = {
      abortSignal: jest.fn().mockRejectedValue(new Error('Network connection lost')),
    };
    const promise = executeQuery(mockQuery, { isIdempotent: false, retries: 5 });
    await jest.runAllTimersAsync();
    const { error } = await promise;
    // Non-idempotent: max 1 retry allowed regardless of retries option
    expect(mockQuery.abortSignal).toHaveBeenCalledTimes(2);
    expect(error?.code).toBe('NETWORK');
  });

  it('handles Supabase error in result.error field', async () => {
    const supabaseError = { code: 'PGRST301', message: 'RLS policy violation' };
    const mockQuery = {
      abortSignal: jest.fn().mockResolvedValue({ data: null, error: supabaseError }),
    };
    const { data, error } = await executeQuery(mockQuery, { retries: 0 });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(['FORBIDDEN', 'UNKNOWN']).toContain(error?.code);
  });
});
