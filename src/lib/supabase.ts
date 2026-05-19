import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// Custom Storage Adapter for Supabase Auth
// 🔴 C1-FIX: setItem and removeItem MUST return their Promises.
// Discarding them (fire-and-forget) means Supabase cannot await the write,
// causing silent token persistence failures across app launches.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("تنبيه: مفاتيح Supabase غير موجودة. يرجى التأكد من ملف .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? localStorage : ExpoSecureStoreAdapter, // Secure Store للموبايل
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});