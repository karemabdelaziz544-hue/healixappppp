require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function check() {
  const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
    }
  });
  console.log(await response.status);
  // It's just PostgREST OpenAPI spec
}
check();
