-- Healix Mobile Database Schema Migration
-- Unified Initial Schema Setup (2026-07-05)

-- =========================================================================
-- 1. Enable Row Level Security & Extensions
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 2. Profiles Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  gender TEXT,
  birth_date DATE,
  weight NUMERIC,
  height NUMERIC,
  avatar_url TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'coach', 'admin')),
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subscription_status TEXT DEFAULT 'new',
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  is_onboarded BOOLEAN DEFAULT false,
  assigned_coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  relation TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile or sub-account profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR auth.uid() = manager_id);

CREATE POLICY "Users can update own profile or sub-account profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR auth.uid() = manager_id);

CREATE POLICY "Users can delete sub-account profiles" ON public.profiles
  FOR DELETE USING (auth.uid() = manager_id);

-- =========================================================================
-- 3. Plans Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'archived')),
  start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can view plans" ON public.plans
  FOR SELECT USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = plans.user_id)
  );

CREATE POLICY "Users and managers can modify plans" ON public.plans
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = plans.user_id)
  );

-- =========================================================================
-- 4. Plan Tasks Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  day_name TEXT,
  content TEXT NOT NULL,
  task_type TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can view plan tasks" ON public.plan_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plans 
      WHERE plans.id = plan_tasks.plan_id AND (
        plans.user_id = auth.uid() OR 
        auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = plans.user_id)
      )
    )
  );

CREATE POLICY "Users and managers can update plan tasks" ON public.plan_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.plans 
      WHERE plans.id = plan_tasks.plan_id AND (
        plans.user_id = auth.uid() OR 
        auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = plans.user_id)
      )
    )
  );

-- =========================================================================
-- 5. Daily Task Logs Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.daily_task_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.plan_tasks(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, task_id, log_date)
);

ALTER TABLE public.daily_task_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can view daily task logs" ON public.daily_task_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = daily_task_logs.user_id)
  );

CREATE POLICY "Users and managers can insert daily task logs" ON public.daily_task_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = daily_task_logs.user_id)
  );

CREATE POLICY "Users and managers can update daily task logs" ON public.daily_task_logs
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = daily_task_logs.user_id)
  );

-- =========================================================================
-- 6. InBody Records Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.inbody_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight NUMERIC NOT NULL,
  muscle_mass NUMERIC,
  fat_percent NUMERIC,
  record_date DATE NOT NULL,
  ai_summary TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.inbody_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can access InBody records" ON public.inbody_records
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = inbody_records.user_id)
  );

-- =========================================================================
-- 7. Client Documents Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can access client documents" ON public.client_documents
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = client_documents.user_id)
  );

-- =========================================================================
-- 8. Health Profile Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.health_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  diseases TEXT[] NOT NULL DEFAULT '{}',
  has_allergies BOOLEAN NOT NULL DEFAULT false,
  allergies_details TEXT,
  diet_type TEXT,
  family_history TEXT[] NOT NULL DEFAULT '{}',
  medications TEXT,
  surgeries TEXT,
  injuries TEXT,
  digestive_issues TEXT[] NOT NULL DEFAULT '{}',
  hormonal_status TEXT
);

ALTER TABLE public.health_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can access health profile" ON public.health_profile
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = health_profile.user_id)
  );

-- =========================================================================
-- 9. Lifestyle Profile Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.lifestyle_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  goal TEXT,
  meals_per_day TEXT,
  has_breakfast BOOLEAN NOT NULL DEFAULT false,
  has_snacks BOOLEAN NOT NULL DEFAULT false,
  late_night_eating BOOLEAN NOT NULL DEFAULT false,
  favorite_foods TEXT,
  disliked_foods TEXT,
  water_liters NUMERIC NOT NULL DEFAULT 0,
  beverages TEXT[] NOT NULL DEFAULT '{}',
  activity_level TEXT,
  does_exercise BOOLEAN NOT NULL DEFAULT false,
  exercise_details JSONB,
  sleep_hours NUMERIC,
  sleep_quality TEXT,
  smoker BOOLEAN NOT NULL DEFAULT false,
  stress_level TEXT,
  work_nature TEXT,
  emotional_eating BOOLEAN NOT NULL DEFAULT false,
  diet_history TEXT,
  supplements TEXT,
  caffeine_intake TEXT,
  appetite_level TEXT,
  weight_plateau BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.lifestyle_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can access lifestyle profile" ON public.lifestyle_profile
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = lifestyle_profile.user_id)
  );

-- =========================================================================
-- 10. Inquiries Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('nutrition', 'meals', 'weight', 'symptoms', 'exercises', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'replied', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can access inquiries" ON public.inquiries
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = inquiries.user_id)
  );

-- =========================================================================
-- 11. Messages Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT,
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IN ('image', 'audio', 'file')),
  recipient_type TEXT,
  inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their received or sent messages" ON public.messages
  FOR SELECT USING (
    sender_id = auth.uid() OR 
    receiver_id = auth.uid() OR
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = sender_id OR id = receiver_id)
  );

CREATE POLICY "Users can insert their sent messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() OR
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = sender_id)
  );

CREATE POLICY "Users can mark received messages as read" ON public.messages
  FOR UPDATE USING (
    receiver_id = auth.uid() OR
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = receiver_id)
  )
  WITH CHECK (
    receiver_id = auth.uid() OR
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = receiver_id)
  );

-- =========================================================================
-- 12. Notifications Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('plan', 'chat', 'alert', 'general')),
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can access notifications" ON public.notifications
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = notifications.user_id)
  );

-- =========================================================================
-- 13. Daily Logs Table (Streak/Gamification)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  water_intake NUMERIC DEFAULT 0,
  calories_consumed NUMERIC DEFAULT 0,
  completed_tasks JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can access daily logs" ON public.daily_logs
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = daily_logs.user_id)
  );

-- =========================================================================
-- 14. Water Tracking Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.water_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.water_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can access water tracking" ON public.water_tracking
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = water_tracking.user_id)
  );

-- =========================================================================
-- 15. Payment Requests Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  receipt_url TEXT NOT NULL,
  renewal_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and managers can view and submit payment requests" ON public.payment_requests
  FOR ALL USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = payment_requests.user_id)
  );

-- =========================================================================
-- 16. Functions & Triggers
-- =========================================================================

-- Trigger to automatically create a profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    phone, 
    gender, 
    subscription_status, 
    is_onboarded, 
    role, 
    updated_at
  ) VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'gender', ''),
    'new',
    false,
    'client',
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC function to safely create sub-members under a manager's billing
CREATE OR REPLACE FUNCTION public.create_sub_member(
  member_name TEXT,
  member_gender TEXT,
  member_birth DATE,
  member_relation TEXT,
  member_height NUMERIC,
  member_weight NUMERIC
)
RETURNS VOID AS $$
DECLARE
  new_member_id UUID;
  manager_sub_status TEXT;
  manager_sub_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate a random UUID for the sub-account since they don't have an auth record
  new_member_id := gen_random_uuid();
  
  -- Fetch manager's subscription details
  SELECT subscription_status, subscription_end_date 
  INTO manager_sub_status, manager_sub_end
  FROM public.profiles 
  WHERE id = auth.uid();

  -- Insert sub-member profile linked to the authenticated manager
  INSERT INTO public.profiles (
    id,
    full_name,
    gender,
    birth_date,
    height,
    weight,
    manager_id,
    role,
    subscription_status,
    subscription_end_date,
    is_onboarded,
    relation,
    updated_at
  ) VALUES (
    new_member_id,
    member_name,
    member_gender,
    member_birth,
    member_height,
    member_weight,
    auth.uid(),
    'client',
    manager_sub_status,
    manager_sub_end,
    false,
    member_relation,
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 17. Storage Bucket Definitions & RLS Policies
-- =========================================================================

-- Ensure standard buckets exist
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-docs', 'medical-docs', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT (id) DO NOTHING;

-- Avatars Policies
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload/update own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    name LIKE auth.uid()::text || '/%'
  );

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    name LIKE auth.uid()::text || '/%'
  );

-- Medical Documents Policies
CREATE POLICY "Users and managers can access own medical docs" ON storage.objects
  FOR ALL USING (
    bucket_id = 'medical-docs' AND
    auth.role() = 'authenticated' AND (
      name LIKE 'inbody/' || auth.uid()::text || '/%' OR
      name LIKE 'docs/' || auth.uid()::text || '/%' OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id::text = split_part(name, '/', 2) AND manager_id = auth.uid()
      )
    )
  );

-- Chat Attachments Policies
CREATE POLICY "Users and managers can access chat attachments" ON storage.objects
  FOR ALL USING (
    bucket_id = 'chat-attachments' AND
    auth.role() = 'authenticated' AND (
      name LIKE auth.uid()::text || '/%' OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id::text = split_part(name, '/', 1) AND manager_id = auth.uid()
      )
    )
  );

-- Receipts Policies
CREATE POLICY "Users and managers can access subscription receipts" ON storage.objects
  FOR ALL USING (
    bucket_id = 'receipts' AND
    auth.role() = 'authenticated' AND (
      name LIKE 'payment_' || auth.uid()::text || '_%' OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id::text = split_part(name, '_', 2) AND manager_id = auth.uid()
      )
    )
  );
