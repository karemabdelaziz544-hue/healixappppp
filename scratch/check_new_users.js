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
  console.log('Fetching profiles...');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, subscription_status, subscription_end_date')
    .order('subscription_status');

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log(`Found ${data.length} profiles:`);
  data.forEach(p => {
    console.log(`- ID: ${p.id} | Name: ${p.full_name} | Role: ${p.role} | Status: ${p.subscription_status} | EndDate: ${p.subscription_end_date}`);
  });
}

check();
