// src/lib/validateEnv.ts

export function validateEnv() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bruafdfakvdreagfeqau.supabase.co';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJydWFmZGZha3ZkcmVhZ2ZlcWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODAzNTYsImV4cCI6MjA4MDA1NjM1Nn0.bIFFTG3McJhYZJYNmhn_24099ahNNdb8oxPsLOGwtZ8';

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}