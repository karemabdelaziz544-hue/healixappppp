require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function checkProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, subscription_status')
    .eq('subscription_status', 'new')
    .limit(5);
  console.log('New profiles:', data);
}
checkProfiles();
