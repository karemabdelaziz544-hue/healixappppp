// @ts-nocheck
// delete-account — Supabase Edge Function
// deletes the authenticated user's account using the service role key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APP_URL = Deno.env.get('APP_URL');
const allowedOrigin = APP_URL ?? null;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : { 'Access-Control-Allow-Origin': '*' }),
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // 1. Authenticate user JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Initialize Supabase Admin client with Service Role Key to delete the user
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 3. Delete the auth user record (cascade deletes profiles and other tables)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ message: 'Success' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[delete-account] Error:', error instanceof Error ? error.stack ?? error.message : error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء محاولة حذف الحساب. يرجى المحاولة لاحقاً.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
