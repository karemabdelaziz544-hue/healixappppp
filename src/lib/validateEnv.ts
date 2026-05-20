/**
 * validateEnv — Runtime config preflight validator
 * =================================================
 * Called once before Supabase client creation.
 * In production (non-DEV): throws a fatal error if required vars are missing.
 * In DEV: logs a clear warning but does not crash.
 *
 * This prevents the app from silently operating in a broken network state
 * where Supabase calls all fail silently with no actionable feedback.
 */

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function validateEnv(): EnvConfig {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    const msg = `[Healix] Missing required environment variables: ${missing.join(', ')}\n` +
      `Ensure your .env file is set up correctly. See README for setup instructions.`;

    if (__DEV__) {
      // In development: warn loudly but continue so developers can see the error
      console.warn(msg);
      // Return placeholder values so TS doesn't complain — Supabase will fail gracefully
      return {
        supabaseUrl: supabaseUrl ?? 'https://placeholder.supabase.co',
        supabaseAnonKey: supabaseAnonKey ?? 'placeholder-anon-key',
      };
    } else {
      // In production: FAIL FAST — do not silently operate in broken state
      throw new Error(msg);
    }
  }

  // At this point TypeScript still sees supabaseUrl/supabaseAnonKey as string | undefined
  // because it can't prove the if/throw above exhausts all undefined cases.
  // The non-null assertions are safe: we verified both exist via `missing` array above.
  return {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
  };
}
