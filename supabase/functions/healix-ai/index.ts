// @ts-nocheck
// healix-ai — Supabase Edge Function
// تستقبل الرسائل من العميل وترسلها لـ Groq للدردشة الصحية والتغذية بناءً على الملف الطبي والمستندات وخطة التغذية

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DASHBOARD_COACH_PROMPT, CHAT_ASSISTANT_PROMPT } from './prompts.ts';

const APP_URL = Deno.env.get('APP_URL');
const allowedOrigin = APP_URL ?? null;
const GROQ_MODEL = Deno.env.get('GROQ_MODEL_NAME') ?? 'llama-3.3-70b-versatile';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : { 'Access-Control-Allow-Origin': '*' }),
};

function safeErrorResponse(error: unknown, statusOverride?: number): Response {
  console.error('[healix-ai] Error:', error instanceof Error ? error.stack ?? error.message : error);
  const message = 'حدث خطأ غير متوقع أثناء الاتصال بالمساعد الذكي. يرجى المحاولة لاحقاً.';
  return new Response(JSON.stringify({ error: message }), {
    status: statusOverride ?? 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, mode = 'chat_assistant', profileId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ——— 1. التحقق من هوية المستخدم (JWT) ———
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

    const userId = user.id;
    let targetUserId = userId;

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const dbClient = serviceRoleKey
      ? createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey)
      : userClient;

    // دعم الحسابات الفرعية العائلية: التأكد من أن البروفايل المطلوب يتبع للمدير الحالي
    if (profileId && profileId !== userId) {
      const { data: profileCheck } = await dbClient
        .from('profiles')
        .select('id, manager_id')
        .eq('id', profileId)
        .maybeSingle();

      if (profileCheck && (profileCheck.id === userId || profileCheck.manager_id === userId)) {
        targetUserId = profileId;
      }
    }

    // ——— 2. استعلام قاعدة البيانات في Supabase بالتوازي لسرعة الاستجابة ———
    const safeQuery = async (promise: Promise<any>) => {
      try {
        const res = await promise;
        if (res.error) {
          console.warn('[healix-ai] Query returned database error:', res.error);
          return null;
        }
        return res.data;
      } catch (err) {
        console.error('[healix-ai] Query exception:', err);
        return null;
      }
    };

    const [
      profileData,
      healthData,
      lifestyleData,
      inbodyData,
      documentsData,
      activePlanData,
      dailyLogsData,
    ] = await Promise.all([
      safeQuery(dbClient.from('profiles').select('full_name, birth_date, gender, weight, height').eq('id', targetUserId).maybeSingle()),
      safeQuery(dbClient.from('health_profile').select('diseases, has_allergies, allergies_details, diet_type, family_history, medications, surgeries, injuries, digestive_issues, hormonal_status').eq('user_id', targetUserId).maybeSingle()),
      safeQuery(dbClient.from('lifestyle_profile').select('goal, meals_per_day, has_breakfast, has_snacks, late_night_eating, favorite_foods, disliked_foods, water_liters, beverages, activity_level, does_exercise, sleep_hours, sleep_quality, smoker, stress_level, work_nature, emotional_eating, supplements, caffeine_intake, appetite_level, weight_plateau').eq('user_id', targetUserId).maybeSingle()),
      safeQuery(dbClient.from('inbody_records').select('weight, muscle_mass, fat_percent, record_date, ai_summary').eq('user_id', targetUserId).order('record_date', { ascending: false }).limit(1).maybeSingle()),
      safeQuery(dbClient.from('client_documents').select('file_name, file_type, created_at').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(5)),
      safeQuery(dbClient.from('plans').select('id, title, start_date, plan_type, created_at').eq('user_id', targetUserId).eq('status', 'active').eq('plan_type', 'nutrition').order('created_at', { ascending: false }).limit(1).maybeSingle()),
      safeQuery(dbClient.from('daily_logs').select('date, completed_tasks').eq('user_id', targetUserId).order('date', { ascending: false }).limit(30)),
    ]);

    // ——— 3. معالجة الخطة النشطة والوجبات والمهام الحالية ———
    let planTasksText = '';
    let completedCount = 0;
    let totalCount = 0;

    if (activePlanData?.id) {
      const activePlanTasks = await safeQuery(
        dbClient
          .from('plan_tasks')
          .select('id, day_name, content, task_type, order_index')
          .eq('plan_id', activePlanData.id)
          .order('order_index', { ascending: true })
      );

      if (activePlanTasks && activePlanTasks.length > 0) {
        // حساب اليوم الحالي في الخطة
        const today = new Date();
        const startDate = new Date(activePlanData.start_date || activePlanData.created_at);
        startDate.setHours(0, 0, 0, 0);
        const currentDayNum = Math.floor((today.getTime() - startDate.getTime()) / 86400000) + 1;

        // تصفية مهام اليوم الحالي
        const todayTasks = activePlanTasks.filter((t: any) => {
          const name = t.day_name || '';
          if (currentDayNum === 1 && /اليوم\s*(الأول|1($|\D))/.test(name)) return true;
          const match = name.match(/\d+/);
          if (match) {
            return parseInt(match[0], 10) === currentDayNum;
          }
          return false;
        });

        // جلب حالة الإتمام لمهام اليوم
        const todayStr = today.toISOString().split('T')[0];
        const todayLogs = await safeQuery(
          dbClient
            .from('daily_task_logs')
            .select('task_id, is_completed')
            .eq('user_id', targetUserId)
            .eq('log_date', todayStr)
        );

        const logsMap = new Map();
        if (todayLogs) {
          todayLogs.forEach((log: any) => logsMap.set(log.task_id, log.is_completed));
        }

        totalCount = todayTasks.length;
        todayTasks.forEach((task: any, index: number) => {
          const isDone = logsMap.has(task.id) ? logsMap.get(task.id) : false;
          if (isDone) completedCount++;
          planTasksText += `  - الوجبة/المهمة ${index + 1}: ${task.content} [حالة الإتمام: ${isDone ? 'مكتملة' : 'غير مكتملة'}]\n`;
        });
      }
    }

    // ——— 4. حساب نسبة الالتزام والـ Streak من سجلات 30 يوماً الماضية ———
    let streak = 0;
    let complianceDays = 0;
    let complianceRate = 0;

    if (dailyLogsData && dailyLogsData.length > 0) {
      const todayForStreak = new Date();
      todayForStreak.setHours(0, 0, 0, 0);

      // حساب الـ Streak المتتالي
      for (let i = 0; i < dailyLogsData.length; i++) {
        const logDate = new Date(dailyLogsData[i].date);
        logDate.setHours(0, 0, 0, 0);
        const expectedDate = new Date(todayForStreak);
        expectedDate.setDate(expectedDate.getDate() - i);
        const hasCompletedTasks = Array.isArray(dailyLogsData[i].completed_tasks) && dailyLogsData[i].completed_tasks.length > 0;
        
        if (logDate.getTime() !== expectedDate.getTime() || !hasCompletedTasks) break;
        streak++;
      }

      // حساب الالتزام في آخر 30 يوماً
      dailyLogsData.forEach((log: any) => {
        if (Array.isArray(log.completed_tasks) && log.completed_tasks.length > 0) {
          complianceDays++;
        }
      });
      complianceRate = Math.round((complianceDays / dailyLogsData.length) * 100);
    }

    // ——— 5. بناء سياق العميل الطبي والغذائي المخصص (Hidden System Prompt) ———
    const activeProfileHeader = `
===== ACTIVE PROFILE =====
- Profile Name: ${profileData?.full_name || 'غير محدد'}
- Relationship: ${profileData?.relation || (targetUserId === userId ? 'المستفيد الرئيسي' : 'تابع')}
- Is Primary Profile: ${targetUserId === userId ? 'Yes' : 'No'}
- Profile ID: ${targetUserId}
- Manager ID: ${userId}
- Gender: ${profileData?.gender || 'غير محدد'}

INSTRUCTION FOR HEALIX AI:
This conversation ONLY refers to this profile (${profileData?.full_name || 'المستخدم'}).
Never use information from the manager or any other family member.
Only answer using the active profile's health data.
`.trim();

    let medicalContext = `\n\n${activeProfileHeader}\n\n=== سياق ملف المشترك الشخصي والطبّي (سرّي للذكاء الاصطناعي فقط) ===\n`;

    if (profileData) {
      medicalContext += `* معلومات شخصية:\n`;
      medicalContext += `  - الاسم: ${profileData.full_name || 'غير محدد'}\n`;
      if (profileData.gender) medicalContext += `  - الجنس: ${profileData.gender === 'male' ? 'ذكر' : 'أنثى'}\n`;
      
      if (profileData.birth_date) {
        const birthDate = new Date(profileData.birth_date);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        medicalContext += `  - العمر: ${age} سنة\n`;
      }
      
      if (profileData.height) medicalContext += `  - الطول: ${profileData.height} سم\n`;
      if (profileData.weight) medicalContext += `  - الوزن الحالي: ${profileData.weight} كجم\n`;
      
      if (profileData.weight && profileData.height) {
        const heightM = profileData.height / 100;
        const bmi = (profileData.weight / (heightM * heightM)).toFixed(1);
        medicalContext += `  - مؤشر كتلة الجسم (BMI): ${bmi}\n`;
      }
    }

    if (lifestyleData) {
      medicalContext += `* معلومات نمط الحياة والأهداف:\n`;
      if (lifestyleData.goal) medicalContext += `  - الهدف الصحي الحالي: ${lifestyleData.goal}\n`;
      if (lifestyleData.activity_level) medicalContext += `  - مستوى النشاط اليومي: ${lifestyleData.activity_level}\n`;
      if (lifestyleData.favorite_foods) medicalContext += `  - الأطعمة المفضلة: ${lifestyleData.favorite_foods}\n`;
      if (lifestyleData.disliked_foods) medicalContext += `  - الأطعمة المستبعدة/غير المفضلة: ${lifestyleData.disliked_foods}\n`;
      if (lifestyleData.sleep_hours) medicalContext += `  - ساعات النوم: ${lifestyleData.sleep_hours} ساعة\n`;
      if (lifestyleData.sleep_quality) medicalContext += `  - جودة النوم: ${lifestyleData.sleep_quality}\n`;
    }

    if (healthData) {
      medicalContext += `* الحالة الطبية والقيود:\n`;
      if (healthData.diseases && healthData.diseases.length > 0) {
        medicalContext += `  - الأمراض أو المشاكل الصحية: ${healthData.diseases.join(', ')}\n`;
      }
      if (healthData.has_allergies) {
        medicalContext += `  - الحساسية الغذائية: نعم (${healthData.allergies_details || 'غير محددة التفاصيل'})\n`;
      } else {
        medicalContext += `  - الحساسية الغذائية: لا توجد حساسيات مسجلة\n`;
      }
      if (healthData.diet_type) medicalContext += `  - نوع النظام الصحي المناسب له: ${healthData.diet_type}\n`;
      if (healthData.medications) medicalContext += `  - الأدوية المستعملة حالياً: ${healthData.medications}\n`;
      if (healthData.surgeries) medicalContext += `  - العمليات الجراحية السابقة: ${healthData.surgeries}\n`;
      if (healthData.injuries) medicalContext += `  - الإصابات: ${healthData.injuries}\n`;
      if (healthData.digestive_issues && healthData.digestive_issues.length > 0) {
        medicalContext += `  - مشاكل الجهاز الهضمي: ${healthData.digestive_issues.join(', ')}\n`;
      }
    }

    if (inbodyData) {
      medicalContext += `* آخر تحليل InBody مسجل (${inbodyData.record_date}):\n`;
      medicalContext += `  - الوزن عند القياس: ${inbodyData.weight} كجم\n`;
      if (inbodyData.muscle_mass) medicalContext += `  - الكتلة العضلية الهيكلية (SMM): ${inbodyData.muscle_mass} كجم\n`;
      if (inbodyData.fat_percent) medicalContext += `  - نسبة الدهون في الجسم: ${inbodyData.fat_percent}%\n`;
      if (inbodyData.ai_summary) medicalContext += `  - ملخص تقييم الـ InBody: ${inbodyData.ai_summary}\n`;
    }

    if (documentsData && documentsData.length > 0) {
      medicalContext += `* المستندات والتحاليل الطبية المرفوعة:\n`;
      documentsData.forEach((doc: any) => {
        medicalContext += `  - ملف: "${doc.file_name}" (نوعه: ${doc.file_type || 'غير محدد'})\n`;
      });
    }

    if (activePlanData) {
      medicalContext += `* البرنامج الغذائي الحالي النشط (${activePlanData.title || 'غير محدد'}):\n`;
      medicalContext += `  - نوع الخطة: ${activePlanData.plan_type}\n`;
      if (activePlanData.start_date) medicalContext += `  - تاريخ البدء: ${activePlanData.start_date}\n`;
      if (planTasksText) {
        medicalContext += `  - مهام ووجبات اليوم الحالي:\n${planTasksText}`;
        medicalContext += `  - إجمالي التقدم لليوم: تم تناول وجبات بمعدل ${completedCount} من أصل ${totalCount}\n`;
      }
    }

    // إضافة إحصائيات الالتزام لربطها بالنقاش
    medicalContext += `* إحصائيات التزام المشترك بالبرنامج:\n`;
    medicalContext += `  - عدد أيام الالتزام المتتالية الحالية (Streak): ${streak} أيام\n`;
    medicalContext += `  - نسبة الالتزام الإجمالية بوجباته في آخر 30 يوماً: ${complianceRate}%\n`;

    medicalContext += `\nيرجى استخدام هذا الملف المخصص للإجابة عن أسئلة المشترك وإبراز النصيحة الموجهة له بشكل دقيق يتناسب مع مرضه، وحساسيته، ووجبات برنامجه الحالي، وأرقام الـ InBody الخاصة به.`;

    // ——— 6. جلب الـ GROQ API Key من Supabase Secrets ———
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY secret is not configured in Supabase');
    }

    const basePrompt = mode === 'dashboard_coach' ? DASHBOARD_COACH_PROMPT : CHAT_ASSISTANT_PROMPT;
    const maxTokensLimit = mode === 'dashboard_coach' ? 150 : 350;

    // ——— 7. دمج موجه النظام مع رسائل الدردشة الحالية ———
    const groqMessages = [
      { role: 'system', content: `${basePrompt}${medicalContext}` },
      ...messages
    ];

    // ——— 8. إرسال المحادثة لـ Groq Completions ———
    const groqController = new AbortController();
    const groqTimeout = setTimeout(() => groqController.abort(), 25_000); // 25s timeout

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
          messages: groqMessages,
          temperature: 0.3,
          max_tokens: maxTokensLimit,
        }),
      });
    } catch (fetchErr: unknown) {
      clearTimeout(groqTimeout);
      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        console.error('[healix-ai] Groq API timeout after 25s');
        return new Response(
          JSON.stringify({ error: 'انتهت مهلة الاتصال بالمساعد الذكي. يرجى المحاولة مجدداً.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchErr;
    } finally {
      clearTimeout(groqTimeout);
    }

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error(`[healix-ai] Groq API error ${groqRes.status}:`, errBody);
      return new Response(
        JSON.stringify({ error: 'تعذر الاتصال بالمساعد الذكي حالياً. يرجى المحاولة مرة أخرى.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const groqJson = await groqRes.json();
    return new Response(
      JSON.stringify(groqJson),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    return safeErrorResponse(error);
  }
});
