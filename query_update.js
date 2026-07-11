require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testUpdate() {
  const { data, error } = await supabase.from('profiles').upsert({
    id: "d9ba7623-2d27-4663-83ed-5a232987ad06",
    subscription_status: 'new'
  });
  console.log("Upsert result:", { data, error });
}
testUpdate();
