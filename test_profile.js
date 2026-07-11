const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'fake_key');
// Actually, this is a React Native app. The keys are in .env
