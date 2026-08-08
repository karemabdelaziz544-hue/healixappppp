import dotenv from 'dotenv';
// Load .env.local which should have SUPABASE_URL and SUPABASE_ANON_KEY pointing to the local emulator
dotenv.config({ path: '.env.local' });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('Integration tests require SUPABASE_URL and SUPABASE_ANON_KEY in .env.local');
}
