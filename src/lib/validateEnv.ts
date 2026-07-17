// src/lib/validateEnv.ts

export function validateEnv() {
  // في Expo، المتغيرات التي تبدأ بـ EXPO_PUBLIC_ يتم حقنها في process.env 
  // ولكن Metro Bundler يتطلب أحياناً استدعاءً صريحاً.
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  console.log("[EnvCheck] URL:", supabaseUrl); // أضفنا هذا للتأكد في الـ Terminal
  console.log("[EnvCheck] Key exists:", !!supabaseAnonKey);

  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = `[Healix Critical] Environment variables missing! 
      URL: ${supabaseUrl ? 'Found' : 'MISSING'} 
      Key: ${supabaseAnonKey ? 'Found' : 'MISSING'}`;

    console.error(errorMsg);

    // بدلاً من الـ Throw فقط، سنقوم بإظهار تنبيه يمنع التطبيق من المضي قدماً
    if (!__DEV__) {
      throw new Error(errorMsg);
    }

    return {
      supabaseUrl: supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey: supabaseAnonKey || 'placeholder',
    };
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}