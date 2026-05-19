// analyze-inbody — Supabase Edge Function
// تستقبل مسار الصورة من Supabase Storage، تجلبها وترسلها لـ Groq (Llama 3.2 90B Vision) لتحليلها
// هذا الملف يعمل في بيئة Deno على Supabase — أخطاء IDE المتعلقة بـ Deno طبيعية ولا تؤثر على التشغيل

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APP_URL = Deno.env.get('APP_URL');
// 🔴 Security: Deny-by-default CORS. If APP_URL is missing, we don't fallback to '*'.
const allowedOrigin = APP_URL ? APP_URL : 'https://healix.app';
// 🔴 M2-FIX: Model name from env var — can be hot-swapped without a code redeploy
// when Groq renames/deprecates the model (as has happened in the LLM ecosystem before).
const GROQ_MODEL = Deno.env.get('GROQ_MODEL_NAME') ?? 'llama-3.2-90b-vision-preview';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // ——— 3. تحميل الصورة وتحويلها لـ base64 ———
    const imageResponse = await fetch(urlData.signedUrl);
    if (!imageResponse.ok) throw new Error('Failed to fetch image from storage');

    const contentLength = Number(imageResponse.headers.get('content-length') || 0);
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit to prevent memory crashes

    if (contentLength > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'Payload Too Large: Image exceeds 5MB limit' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Unsupported Media Type: Only images are allowed' }), {
        status: 415,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(imageBuffer);

    // تحويل آمن لـ base64 (بدون stack overflow للصور الكبيرة)
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    const imageBase64 = btoa(binary);

    // ——— 4. إرسال الصورة لـ Groq Vision (Llama 3.2 90B Vision) ———
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL, // 🌟 M2-FIX: from env var, hot-swappable without redeploy
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
        temperature: 0.1, // 🔴 تقليل درجة الإبداع لزيادة الدقة في استخراج الأرقام
        max_tokens: 500,
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      throw new Error(`Groq API error: ${groqRes.status} — ${errBody}`);
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
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});