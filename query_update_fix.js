require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testUpdate() {
  // Let's create an anonymous user with auth.signUp
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: 'test_user_' + Math.floor(Math.random() * 100000) + '@test.com',
    password: 'Password123!',
    options: {
      data: { full_name: 'Test Update User' }
    }
  });
  if (authErr) { console.log(authErr); return; }
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Now try to UPDATE as that user
  const { data, error } = await supabase.from('profiles').update({
    subscription_status: 'new'
  }).eq('id', authData.user.id);
  
  console.log("Update result:", { data, error });
  
  // Verify
  const { data: profData } = await supabase.from('profiles').select('subscription_status').eq('id', authData.user.id).single();
  console.log("Verified profile:", profData);
}
testUpdate();
