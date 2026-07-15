// Simulate the admin dashboard queries to check for errors
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('/Users/karemabdelaziz/Coding/healix-app/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = env['EXPO_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Simulating admin dashboard query...');
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*, profiles(full_name, email, avatar_url, phone)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('DATABASE QUERY ERROR:', error);
  } else {
    console.log('SUCCESS! Loaded requests:', data.length);
  }
}

check();
