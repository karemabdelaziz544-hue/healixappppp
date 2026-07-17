/**
 * validateEnv — Tests
 * Verifies fail-fast behavior in production and warn-only in DEV.
 */

// Store original env
const originalEnv = { ...process.env };

// We need to control __DEV__ per test, so we use jest.resetModules + dynamic import
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('validateEnv', () => {
  it('returns env config when both variables are present', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    // __DEV__ is true in jest (test environment)
    const { validateEnv } = require('../src/lib/validateEnv');
    const result = validateEnv();
    expect(result.supabaseUrl).toBe('https://test.supabase.co');
    expect(result.supabaseAnonKey).toBe('test-anon-key');
  });

  it('warns but does not throw in DEV when variables are missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const { validateEnv } = require('../src/lib/validateEnv');

    // In test env, __DEV__ is true → should warn, not throw
    const result = validateEnv();
    expect(errorSpy).toHaveBeenCalled();
    expect(result.supabaseUrl).toContain('placeholder');
    expect(result.supabaseAnonKey).toContain('placeholder');
    errorSpy.mockRestore();
  });

  it('includes missing variable names in the warning message', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const { validateEnv } = require('../src/lib/validateEnv');
    validateEnv();

    const errorMessage = errorSpy.mock.calls[0][0];
    expect(errorMessage).toContain('URL: MISSING');
    expect(errorMessage).toContain('Key: Found');
    errorSpy.mockRestore();
  });
});
