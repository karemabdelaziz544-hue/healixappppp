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
  console.log('Querying public tables from remote database...');
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Error connecting to profiles:', error);
  } else {
    console.log('Profiles table connection OK');
  }

  const tablesToTest = [
    'profiles', 'plans', 'plan_tasks', 'inbody_records', 'client_documents',
    'health_profile', 'lifestyle_profile', 'laboratory_results', 'lab_results',
    'laboratory', 'user_labs'
  ];

  for (const table of tablesToTest) {
    const { error: selectError } = await supabase.from(table).select('*').limit(0);
    if (selectError) {
      if (selectError.code === 'PGRST116' || selectError.message.includes('does not exist') || selectError.message.includes('not found')) {
        console.log(`❌ Table "${table}" does NOT exist`);
      } else {
        console.log(`✅ Table "${table}" EXISTS (returned error: ${selectError.message})`);
      }
    } else {
      console.log(`✅ Table "${table}" EXISTS`);
    }
  }
}

check();
