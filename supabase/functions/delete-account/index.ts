// @ts-nocheck
// delete-account — Supabase Edge Function
// Deletes the authenticated user's account and all associated profile/sub-account data

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

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

    const userId = user.id;

    // 2. Initialize Supabase Admin client with Service Role Key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 3. Collect all profile IDs owned/managed by this user (main + sub-accounts)
    const { data: subProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(`id.eq.${userId},manager_id.eq.${userId}`);

    const allProfileIds = (subProfiles || []).map((p: any) => p.id);
    if (!allProfileIds.includes(userId)) {
      allProfileIds.push(userId);
    }

    // 4. Safely clean up dependent data across all tables for these profiles
    await Promise.allSettled([
      supabaseAdmin.from('family_subscription_memberships').delete().in('manager_id', allProfileIds),
      supabaseAdmin.from('family_subscription_memberships').delete().in('member_id', allProfileIds),
      supabaseAdmin.from('family_medical_consents').delete().in('manager_id', allProfileIds),
      supabaseAdmin.from('family_medical_consents').delete().in('member_id', allProfileIds),
      supabaseAdmin.from('subscriptions').delete().in('manager_id', allProfileIds),
      supabaseAdmin.from('payment_requests').delete().in('user_id', allProfileIds),
      supabaseAdmin.from('health_profile').delete().in('user_id', allProfileIds),
      supabaseAdmin.from('lifestyle_profile').delete().in('user_id', allProfileIds),
      supabaseAdmin.from('inbody_records').delete().in('user_id', allProfileIds),
      supabaseAdmin.from('client_documents').delete().in('user_id', allProfileIds),
      supabaseAdmin.from('daily_logs').delete().in('user_id', allProfileIds),
      supabaseAdmin.from('daily_task_logs').delete().in('user_id', allProfileIds),
      supabaseAdmin.from('activity_logs').delete().in('user_id', allProfileIds),
      supabaseAdmin.from('messages').delete().or(`sender_id.in.(${allProfileIds.join(',')}),recipient_id.in.(${allProfileIds.join(',')})`),
      supabaseAdmin.from('push_subscriptions').delete().in('user_id', allProfileIds),
    ]);

    // 5. Delete child profiles first, then main profile
    await supabaseAdmin.from('profiles').delete().eq('manager_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 6. Delete auth user record permanently from Supabase Auth
    try {
      const { error: adminDelError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (adminDelError) {
        console.warn('[delete-account] Admin deleteUser returned error:', adminDelError);
      } else {
        console.log('[delete-account] Successfully deleted user from auth.users:', userId);
      }
    } catch (adminErr) {
      console.warn('[delete-account] Admin deleteUser exception:', adminErr);
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
