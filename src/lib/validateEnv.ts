// src/lib/validateEnv.ts

export function validateEnv() {
  const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const urlStatus = rawUrl ? 'Found' : 'MISSING';
  const keyStatus = rawKey ? 'Found' : 'MISSING';

  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

  if (!rawUrl || !rawKey) {
    const errorMsg = `[validateEnv] Configuration Error — URL: ${urlStatus}, Key: ${keyStatus}`;

    if (!isDev) {
      console.error(errorMsg);
      throw new Error(errorMsg);
    } else {
      console.error(errorMsg);
    }
  }

  return {
    supabaseUrl: rawUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey: rawKey || 'placeholder-key',
  };
}