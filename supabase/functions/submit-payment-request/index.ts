// @ts-nocheck
// submit-payment-request — authenticated, compensating payment submission.
// Storage and Postgres cannot share a transaction; this function owns both and
// removes the private receipt if the database workflow rejects the request.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_BYTES = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/heic', 'application/pdf']);
const extensionByMime: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'application/pdf': 'pdf',
};
const validPaymentTypes = new Set(['new', 'renewal', 'upgrade', 'downgrade']);
const appUrl = Deno.env.get('APP_URL');
const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  ...(appUrl ? { 'Access-Control-Allow-Origin': appUrl } : {}),
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  let receiptPath: string | null = null;
  try {
    const authorization = req.headers.get('Authorization') ?? '';
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!url || !anonKey || !serviceRoleKey) throw new Error('Function environment is incomplete');

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return response({ error: 'Unauthorized' }, 401);

    const input = await req.json();
    if (!allowedMimeTypes.has(input.contentType) || typeof input.receiptBase64 !== 'string') return response({ error: 'نوع ملف الإيصال غير مدعوم.' }, 400);
    if (!Number.isInteger(input.subCount) || input.subCount < 0 || input.subCount > 20) return response({ error: 'عدد أفراد العائلة غير صالح.' }, 400);

    // Validate payment type
    const paymentType = input.paymentType || 'new';
    if (!validPaymentTypes.has(paymentType)) return response({ error: 'نوع العملية غير صالح.' }, 400);

    const bytes = decodeBase64(input.receiptBase64);
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return response({ error: 'حجم الإيصال يجب ألا يتجاوز 10 ميغابايت.' }, 413);
    const extension = extensionByMime[input.contentType];

    const { data: profile, error: profileError } = await userClient
      .from('profiles').select('id').eq('id', user.id).is('manager_id', null).maybeSingle();
    if (profileError || !profile) return response({ error: 'تعذر التحقق من الحساب.' }, 403);

    receiptPath = `receipts/${profile.id}/${crypto.randomUUID()}.${extension}`;
    const adminClient = createClient(url, serviceRoleKey);
    const { error: uploadError } = await adminClient.storage.from('receipts').upload(receiptPath, bytes, {
      contentType: input.contentType, upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: requestRow, error: requestError } = await userClient.rpc('create_payment_request', {
      p_receipt_path: receiptPath,
      p_sub_count: input.subCount,
      p_payment_type: paymentType,
      p_keep_member_ids: Array.isArray(input.keepMemberIds) ? input.keepMemberIds : [],
      p_declared_transferred_amount: typeof input.declaredTransferredAmount === 'number' ? input.declaredTransferredAmount : null,
      p_previous_request_id: typeof input.previousRequestId === 'string' && input.previousRequestId ? input.previousRequestId : null,
    });
    if (requestError) {
      await adminClient.storage.from('receipts').remove([receiptPath]);
      receiptPath = null;
      return response({ error: requestError.message || 'تعذر إرسال طلب الدفع. تحقق من عدم وجود طلب معلّق ثم حاول مجدداً.' }, 409);
    }
    return response({ request: requestRow });
  } catch (error) {
    console.error('[submit-payment-request]', error);
    if (receiptPath) {
      try {
        const url = Deno.env.get('SUPABASE_URL') ?? '';
        const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        await createClient(url, key).storage.from('receipts').remove([receiptPath]);
      } catch { /* best-effort compensation; original failure is logged */ }
    }
    return response({ error: 'حدث خطأ أثناء إرسال طلب الدفع. يرجى المحاولة لاحقاً.' }, 500);
  }
});
