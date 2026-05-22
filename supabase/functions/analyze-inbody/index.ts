// analyze-inbody — Supabase Edge Function
// تستقبل مسار الصورة من Supabase Storage، تجلبها وترسلها لـ Groq (Llama 3.2 90B Vision) لتحليلها
// هذا الملف يعمل في بيئة Deno على Supabase — أخطاء IDE المتعلقة بـ Deno طبيعية ولا تؤثر على التشغيل

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APP_URL = Deno.env.get('APP_URL');
// 🔴 AUDIT FIX (M2): If APP_URL is not set, use null → CORS will reject
// all cross-origin requests. Previously hardcoded to 'https://healix.app'
// which could cause drift between staging and production.
const allowedOrigin = APP_URL ?? null;
// 🔴 M2-FIX: Model name from env var — hot-swappable without code redeploy
const GROQ_MODEL = Deno.env.get('GROQ_MODEL_NAME') ?? 'llama-3.2-90b-vision-preview';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB hard cap

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
};

/**
 * 🔴 AUDIT FIX (C3): Redact internal error details from 500 responses.
 * Third-party API failures (Groq error payloads, Supabase internal messages)
 * must never leak to the client. Users see a generic Arabic message; full
 * error goes to function logs for debugging.
 */
function safeErrorResponse(error: unknown, statusOverride?: number): Response {
  // Log the FULL error to Deno's runtime logs (visible in Supabase Dashboard → Logs)
  console.error('[analyze-inbody] Internal error:', error instanceof Error ? error.stack ?? error.message : error);

  const message = 'حدث خطأ داخلي أثناء تحليل الصورة. يرجى المحاولة مرة أخرى لاحقاً.';
  return new Response(JSON.stringify({ error: message }), {
    status: statusOverride ?? 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * 🔴 AUDIT FIX (C2): Stream-based byte cap for image download.
 * The previous code checked `content-length` header before downloading,
 * but if the header is absent or spoofed, the full payload was downloaded
 * into memory and converted to base64 — causing memory spikes and DoS risk.
 *
 * This function reads the response body as a stream and aborts immediately
 * when the cumulative size exceeds the cap, regardless of what the
 * content-length header says.
 */
async function downloadWithByteCap(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      // Abort the stream immediately — do not buffer any more data
      await reader.cancel();
      throw new Error(`PAYLOAD_TOO_LARGE: Image exceeds ${maxBytes} byte limit (read ${totalBytes} bytes so far)`);
    }
    chunks.push(value);
  }

  // Merge chunks into single Uint8Array
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imagePath } = await req.json();

    if (!imagePath) {
      return new Response(JSON.stringify({ error: 'imagePath is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ——— 1. التحقق من هوية المستخدم (JWT) وملكية الملف ———
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // التأكد أن المستخدم يحاول قراءة ملف في المجلد الخاص به فقط
    if (!imagePath.startsWith(`inbody/${user.id}/`)) {
      return new Response(JSON.stringify({ error: 'غير مصرح لك بالوصول إلى ملفات مستخدمين آخرين' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ——— 1.5 Rate Limiting (5 times per 24h) ———
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await userClient
      .from('inbody_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneDayAgo);

    if (!countError && count !== null && count >= 5) {
      return new Response(JSON.stringify({ error: 'لقد تجاوزت الحد اليومي لتحليل InBody (5 تحاليل / 24 ساعة)' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ——— 2. جلب الـ GROQ API Key من Supabase Secrets ———
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY secret is not configured in Supabase');
    }

    // ——— 3. إنشاء Supabase Admin client لجلب الصورة من Storage ———
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // جلب signed URL للصورة
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('medical-docs')
      .createSignedUrl(imagePath, 60);

    if (urlError || !urlData?.signedUrl) {
      throw new Error('Could not generate signed URL for image');
    }

    // ——— 3.5 تحميل الصورة بطريقة آمنة (streamed byte cap) ———
    const imageResponse = await fetch(urlData.signedUrl);
    if (!imageResponse.ok) throw new Error('Failed to fetch image from storage');

    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Unsupported Media Type: Only images are allowed' }), {
        status: 415,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 🔴 AUDIT FIX (C2): Stream-based byte cap.
    // Previously: checked content-length header (easily spoofed), then downloaded
    // the ENTIRE body via arrayBuffer(). If header was absent or lied, memory
    // could spike unbounded.
    // Now: reads body as a stream and aborts the moment cumulative bytes exceed cap.
    let bytes: Uint8Array;
    try {
      bytes = await downloadWithByteCap(imageResponse, MAX_IMAGE_SIZE);
    } catch (sizeErr: unknown) {
      const errMsg = sizeErr instanceof Error ? sizeErr.message : '';
      if (errMsg.includes('PAYLOAD_TOO_LARGE')) {
        return new Response(JSON.stringify({ error: 'حجم الصورة أكبر من الحد المسموح (5 ميجابايت)' }), {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw sizeErr; // Re-throw unexpected stream errors
    }

    // تحويل آمن لـ base64 (بدون stack overflow للصور الكبيرة)
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    const imageBase64 = btoa(binary);

    // ——— 4. إرسال الصورة لـ Groq Vision ———
    // 🔴 AUDIT FIX: AbortController with 60s timeout prevents billing spike
    // if Groq API hangs. Without this, the Edge Function would run until
    // Supabase's execution limit (~150s), consuming resources on every hang.
    const groqController = new AbortController();
    const groqTimeout = setTimeout(() => groqController.abort(), 60_000);

    let groqRes: Response;
    try {
      groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: groqController.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `أنت كوتش تغذية وطبيب متخصص. انظر لهذه الصورة من فحص InBody واستخرج الأرقام بدقة، ثم قدم تقييم ونصيحة.
أجب بالعربية فقط والتزم حرفياً بهذا التنسيق بدون أي إضافات أخرى:
الوزن: [الرقم]
العضلات: [الرقم]
الدهون: [الرقم]
التقييم: [جملة أو جملتين]
التوصية: [جملة]`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });
    } catch (fetchErr: unknown) {
      clearTimeout(groqTimeout);
      // Abort errors mean timeout was hit
      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        console.error('[analyze-inbody] Groq API timeout after 60s');
        return new Response(
          JSON.stringify({ error: 'انتهت مهلة تحليل الصورة. يرجى المحاولة مرة أخرى.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchErr;
    } finally {
      clearTimeout(groqTimeout);
    }

    if (!groqRes.ok) {
      // 🔴 AUDIT FIX (C3): Log full Groq error to Deno console but DO NOT
      // return it to the client. Previously: `throw new Error(Groq API error: ... ${errBody})`
      // which would leak Groq's internal error payload verbatim in the 500 response.
      const errBody = await groqRes.text();
      console.error(`[analyze-inbody] Groq API error ${groqRes.status}:`, errBody);
      return new Response(
        JSON.stringify({ error: 'تعذر تحليل الصورة حالياً. يرجى المحاولة مرة أخرى بعد قليل.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqJson = await groqRes.json();
    const analysisText = groqJson?.choices?.[0]?.message?.content ?? '';

    // ——— 5. استخراج الأرقام من نص Groq ———
    const weightMatch = analysisText.match(/الوزن[:\s]+([0-9.]+)/);
    const muscleMatch = analysisText.match(/العضلات[:\s]+([0-9.]+)/);
    const fatMatch = analysisText.match(/الدهون[:\s]+([0-9.]+)/);

    return new Response(
      JSON.stringify({
        analysis: analysisText,
        extracted: {
          weight: weightMatch ? parseFloat(weightMatch[1]) : null,
          muscle: muscleMatch ? parseFloat(muscleMatch[1]) : null,
          fat: fatMatch ? parseFloat(fatMatch[1]) : null,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    // 🔴 AUDIT FIX (C3): Generic error response with redacted internal details.
    // Full error logged to Deno console for debugging; client gets safe message.
    return safeErrorResponse(error);
  }
});