require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function checkTrigger() {
  const { data, error } = await supabase.rpc('hello_world'); // Just to test if we can do rpc, actually we can't query pg_catalog without admin key.
  
  // Let's create a new user via API and see what the status is!
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: 'test_user_' + Date.now() + '@example.com',
    password: 'Password123!',
    options: {
      data: {
        full_name: 'Test User'
      }
    }
  });
  
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }
  
  // Wait 2 seconds for trigger
  await new Promise(r => setTimeout(r, 2000));
  
  const { data: profData } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', authData.user.id)
    .single();
    
  console.log('Created user profile:', profData);
}
checkTrigger();
