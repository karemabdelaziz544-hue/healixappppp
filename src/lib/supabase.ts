import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { validateEnv } from './validateEnv';

// Custom Storage Adapter for Supabase Auth
// 🔴 C1-FIX: setItem and removeItem MUST return their Promises.
// Discarding them (fire-and-forget) means Supabase cannot await the write,
// causing silent token persistence failures across app launches.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// 🔴 AUDIT FIX: Fail-fast env validation.
// In production: throws immediately if vars are missing (prevents silent broken state).
// In DEV: warns but continues to allow debugging without a real .env.
const { supabaseUrl, supabaseAnonKey } = validateEnv();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? localStorage : ExpoSecureStoreAdapter, // Secure Store للموبايل
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});