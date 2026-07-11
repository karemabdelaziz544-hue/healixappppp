-- =========================================================================
-- Migration: 20260708000001_exercises_schema.sql
-- Description:
--   1. Create preset_exercises table
--   2. Add metadata column to plan_tasks table
--   3. Enable RLS and insert default exercises
-- =========================================================================

-- 1. Create preset_exercises table
CREATE TABLE IF NOT EXISTS public.preset_exercises (
  id TEXT PRIMARY KEY, -- e.g. 'walking', 'squat', 'plank'
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g. 'CARDIO', 'STRENGTH'
  difficulty TEXT NOT NULL, -- e.g. 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'
  muscle TEXT NOT NULL, -- e.g. 'كامل الجسم', 'الفخذ والغلوتس'
  default_duration TEXT NOT NULL DEFAULT '15 min',
  default_calories TEXT NOT NULL DEFAULT '100 kcal',
  default_sets TEXT NOT NULL DEFAULT '3 sets x 12',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  mistakes JSONB NOT NULL DEFAULT '[]'::jsonb,
  tips TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.preset_exercises ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to preset exercises for authenticated users"
  ON public.preset_exercises FOR SELECT
  TO authenticated
  USING (true);

-- Allow write access only to admins/doctors
CREATE POLICY "Allow write access to preset exercises for admins and doctors"
  ON public.preset_exercises FOR ALL
  TO authenticated
  USING (check_user_is_admin(auth.uid()) OR public.check_user_is_medical_professional(auth.uid()));

-- 2. Add metadata column to plan_tasks
ALTER TABLE public.plan_tasks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- 3. Insert initial preset exercises
INSERT INTO public.preset_exercises (id, title, category, difficulty, muscle, default_duration, default_calories, default_sets, steps, mistakes, tips, image_url)
VALUES 
(
  'walking', 
  'المشي السريع (Walking)', 
  'CARDIO', 
  'BEGINNER', 
  'كامل الجسم', 
  '30 min', 
  '180 kcal', 
  'جولة واحدة مستمرة', 
  '["قف مستقيماً وادفع كتفيك للخلف قليلاً.", "ابدأ بالمشي بسرعة معتدلة لتنشيط الدورة الدموية.", "ارفع السرعة لتصل لمعدل مشي سريع يزيد ضربات القلب."]'::jsonb,
  '[{"title": "وضعية انحناء الظهر", "desc": "حافظ على استقامة ظهرك ورفع كتفيك للخلف أثناء المشي."}, {"title": "الخطوات الطويلة جداً", "desc": "اجعل خطواتك طبيعية لعدم التسبب بإجهاد المفاصل."}]'::jsonb,
  'تمرين ممتاز لتنشيط الدورة الدموية وحرق السعرات بجهد بسيط ونسبة إجهاد منخفضة.',
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=300&auto=format&fit=crop'
),
(
  'squat', 
  'تمرين القرفصاء (Squat)', 
  'STRENGTH', 
  'INTERMEDIATE', 
  'الفخذ والغلوتس', 
  '15 min', 
  '120 kcal', 
  '3 جولات × 12 تكرار', 
  '["قف مباعداً بين قدميك بمحاذاة كتفيك.", "اهبط للأسفل كأنك تجلس على كرسي ودفع الأرداف للخلف.", "اضغط على باطن قدميك للعودة لوضعية الوقوف وشد عضلات الفخذ."]'::jsonb,
  '[{"title": "انحناء أسفل الظهر", "desc": "حافظ على شد جذع الجسم ودفع الصدر للأعلى لحماية ظهرك."}, {"title": "ميلان الركبتين للداخل", "desc": "ادفع ركبتيك للخارج باتجاه أصابع قدميك أثناء الهبوط."}]'::jsonb,
  'تمرين أساسي لبناء عضلات الجزء السفلي وتقوية الجذع والمفاصل.',
  'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=300&auto=format&fit=crop'
),
(
  'plank', 
  'تمرين البلانك (Plank)', 
  'STRENGTH', 
  'BEGINNER', 
  'عضلات البطن والجذع', 
  '10 min', 
  '60 kcal', 
  '3 جولات × 30 ثانية', 
  '["اتخذ وضعية الضغط مع وضع الساعدين على الأرض بمحاذاة الأكتاف.", "حافظ على استقامة رأسك وعنقك وجسمك بالكامل كخط مستقيم.", "شد عضلات البطن والجذع واستمر في هذه الوضعية مع التنفس بانتظام."]'::jsonb,
  '[{"title": "هبوط الخصر والوركين", "desc": "لا تدع خصرك يرتخي للأسفل؛ حافظ على استقامة الظهر."}, {"title": "حبس الأنفاس", "desc": "تنفس بانتظام وعمق طوال فترة التمرين لتجنب ارتفاع ضغط الدم."}]'::jsonb,
  'تمرين رائع لبناء قوة تحمل عضلات البطن والجذع وتحسين استقامة الجسم.',
  'https://images.unsplash.com/photo-1566241477600-ac026ad43874?q=80&w=300&auto=format&fit=crop'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  muscle = EXCLUDED.muscle,
  default_duration = EXCLUDED.default_duration,
  default_calories = EXCLUDED.default_calories,
  default_sets = EXCLUDED.default_sets,
  steps = EXCLUDED.steps,
  mistakes = EXCLUDED.mistakes,
  tips = EXCLUDED.tips,
  image_url = EXCLUDED.image_url;
