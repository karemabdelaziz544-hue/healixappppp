// @ts-nocheck
// analyze-inbody — Supabase Edge Function
// تستقبل مسار الصورة من Supabase Storage، تجلبها وترسلها لـ Groq (Llama 3.2 90B Vision) لتحليلها
// هذا الملف يعمل في بيئة Deno على Supabase — أخطاء IDE طبيعية

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    // ——— 1. جلب الـ GROQ API Key من Supabase Secrets ———
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY secret is not configured in Supabase');
    }

    // ——— 2. إنشاء Supabase client لجلب الصورة من Storage ———
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // جلب signed URL للصورة
    const { data: urlData, error: urlError } = await supabase.storage
      .from('medical-docs')
      .createSignedUrl(imagePath, 60);

    if (urlError || !urlData?.signedUrl) {
      throw new Error('Could not generate signed URL for image');
    }

    // ——— 3. تحميل الصورة وتحويلها لـ base64 ———
    const imageResponse = await fetch(urlData.signedUrl);
    if (!imageResponse.ok) throw new Error('Failed to fetch image from storage');

    const imageBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(imageBuffer);

    // تحويل آمن لـ base64 (بدون stack overflow للصور الكبيرة)
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    const imageBase64 = btoa(binary);

    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // ——— 4. إرسال الصورة لـ Groq Vision (Llama 3.2 90B Vision) ———
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview", // 🔴 استخدام موديل الرؤية الجديد من Groq
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