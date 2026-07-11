-- Healix Database Migration: Transition Coach to Doctor & Update RLS Policies
-- Execute this SQL in your Supabase SQL Editor.

-- =========================================================================
-- 1. Align Roles and Constraints (Convert 'coach' to 'doctor')
-- =========================================================================

-- Update existing profiles that hold the obsolete 'coach' role to 'doctor'
UPDATE public.profiles 
SET role = 'doctor' 
WHERE role = 'coach';

-- Re-establish the check constraint on profiles.role to enforce the three strict roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('client', 'doctor', 'admin'));

-- =========================================================================
-- 2. Rename Column assigned_coach_id to assigned_doctor_id
-- =========================================================================

DO $$ 
BEGIN
  -- If both columns exist:
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'assigned_coach_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'assigned_doctor_id'
  ) THEN
    -- Copy data if doctor ID is null but coach ID is set
    UPDATE public.profiles 
    SET assigned_doctor_id = assigned_coach_id 
    WHERE assigned_doctor_id IS NULL AND assigned_coach_id IS NOT NULL;
    
    -- Drop the obsolete coach column
    ALTER TABLE public.profiles DROP COLUMN assigned_coach_id;
  
  -- If only assigned_coach_id exists, rename it to assigned_doctor_id
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'assigned_coach_id'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN assigned_coach_id TO assigned_doctor_id;
  
  -- If only assigned_doctor_id exists or neither, make sure assigned_doctor_id is created
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'assigned_doctor_id'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN assigned_doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- =========================================================================
-- 3. Create non-recursive role-checking functions (Bypasses RLS)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.check_user_is_medical_professional(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role IN ('admin', 'doctor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_user_is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 4. Rewrite Row-Level Security (RLS) Policies
-- =========================================================================

-- --- Profiles Table Policies ---
DROP POLICY IF EXISTS "Users can view own profile or sub-account profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users, assigned coaches, and admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users, assigned doctors, and admins can view profiles" ON public.profiles;
CREATE POLICY "Users, assigned doctors, and admins can view profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR auth.uid() = manager_id 
    OR auth.uid() = assigned_doctor_id
    OR public.check_user_is_medical_professional(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own profile or sub-account profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users, assigned coaches, and admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can update profiles" ON public.profiles;
CREATE POLICY "Users and admins can update profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id 
    OR auth.uid() = manager_id 
    OR public.check_user_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete sub-account profiles" ON public.profiles;
CREATE POLICY "Users can delete sub-account profiles" ON public.profiles
  FOR DELETE USING (
    auth.uid() = manager_id 
    OR public.check_user_is_admin(auth.uid())
  );

-- --- Plans Table Policies ---
DROP POLICY IF EXISTS "Users and managers can view plans" ON public.plans;
DROP POLICY IF EXISTS "Users, assigned coaches, and admins can view plans" ON public.plans;
DROP POLICY IF EXISTS "Authorized roles can view plans" ON public.plans;
CREATE POLICY "Authorized roles can view plans" ON public.plans
  FOR SELECT USING (
    user_id = auth.uid() 
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = plans.user_id)
    OR auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = plans.user_id)
    OR public.check_user_is_medical_professional(auth.uid())
  );

DROP POLICY IF EXISTS "Users and managers can modify plans" ON public.plans;
DROP POLICY IF EXISTS "Users, assigned coaches, and admins can modify plans" ON public.plans;
DROP POLICY IF EXISTS "Doctors and admins can manage plans" ON public.plans;
CREATE POLICY "Doctors and admins can manage plans" ON public.plans
  FOR ALL USING (
    user_id = auth.uid() 
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = plans.user_id)
    OR auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = plans.user_id)
    OR public.check_user_is_medical_professional(auth.uid())
  );

-- --- Plan Tasks Table Policies ---
DROP POLICY IF EXISTS "Users and managers can view plan tasks" ON public.plan_tasks;
DROP POLICY IF EXISTS "Authorized roles can view plan tasks" ON public.plan_tasks;
CREATE POLICY "Authorized roles can view plan tasks" ON public.plan_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plans 
      WHERE plans.id = plan_tasks.plan_id AND (
        plans.user_id = auth.uid() 
        OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = plans.user_id)
        OR auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = plans.user_id)
        OR public.check_user_is_medical_professional(auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users and managers can update plan tasks" ON public.plan_tasks;
DROP POLICY IF EXISTS "Authorized roles can update plan tasks" ON public.plan_tasks;
CREATE POLICY "Authorized roles can update plan tasks" ON public.plan_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.plans 
      WHERE plans.id = plan_tasks.plan_id AND (
        plans.user_id = auth.uid() 
        OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = plans.user_id)
        OR auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = plans.user_id)
        OR public.check_user_is_medical_professional(auth.uid())
      )
    )
  );

-- --- InBody Records Table Policies ---
DROP POLICY IF EXISTS "Users and managers can access InBody records" ON public.inbody_records;
DROP POLICY IF EXISTS "Users, assigned coaches, and admins can view/write InBody" ON public.inbody_records;
DROP POLICY IF EXISTS "Authorized roles can access InBody records" ON public.inbody_records;
CREATE POLICY "Authorized roles can access InBody records" ON public.inbody_records
  FOR ALL USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = inbody_records.user_id)
    OR auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = inbody_records.user_id)
    OR public.check_user_is_medical_professional(auth.uid())
  );

-- --- Client Documents Table Policies ---
DROP POLICY IF EXISTS "Users and managers can access client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Authorized roles can access client documents" ON public.client_documents;
CREATE POLICY "Authorized roles can access client documents" ON public.client_documents
  FOR ALL USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = client_documents.user_id)
    OR auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = client_documents.user_id)
    OR public.check_user_is_medical_professional(auth.uid())
  );

-- --- Health Profile Table Policies ---
DROP POLICY IF EXISTS "Users and managers can access health profile" ON public.health_profile;
DROP POLICY IF EXISTS "Authorized roles can access health profile" ON public.health_profile;
CREATE POLICY "Authorized roles can access health profile" ON public.health_profile
  FOR ALL USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = health_profile.user_id)
    OR auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = health_profile.user_id)
    OR public.check_user_is_medical_professional(auth.uid())
  );

-- --- Lifestyle Profile Table Policies ---
DROP POLICY IF EXISTS "Users and managers can access lifestyle profile" ON public.lifestyle_profile;
DROP POLICY IF EXISTS "Authorized roles can access lifestyle profile" ON public.lifestyle_profile;
CREATE POLICY "Authorized roles can access lifestyle profile" ON public.lifestyle_profile
  FOR ALL USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = lifestyle_profile.user_id)
    OR auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = lifestyle_profile.user_id)
    OR public.check_user_is_medical_professional(auth.uid())
  );

-- --- Inquiries Table Policies ---
DROP POLICY IF EXISTS "Users can view their own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Users can insert their own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Users can update their own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Users and managers can access inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Authorized roles can access inquiries" ON public.inquiries;
CREATE POLICY "Authorized roles can access inquiries" ON public.inquiries
  FOR ALL USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = inquiries.user_id)
    OR auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = inquiries.user_id)
    OR public.check_user_is_medical_professional(auth.uid())
  );

-- --- Messages Table Policies ---
DROP POLICY IF EXISTS "Users can select their received or sent messages" ON public.messages;
DROP POLICY IF EXISTS "Users and admins can select messages" ON public.messages;
CREATE POLICY "Users and admins can select messages" ON public.messages
  FOR SELECT USING (
    sender_id = auth.uid() 
    OR receiver_id = auth.uid() 
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = sender_id OR id = receiver_id)
    OR public.check_user_is_medical_professional(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert their sent messages" ON public.messages;
DROP POLICY IF EXISTS "Users and admins can insert messages" ON public.messages;
CREATE POLICY "Users and admins can insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() 
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = sender_id)
    OR public.check_user_is_medical_professional(auth.uid())
  );

DROP POLICY IF EXISTS "Users can mark received messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users and admins can update messages" ON public.messages;
CREATE POLICY "Users and admins can update messages" ON public.messages
  FOR UPDATE USING (
    receiver_id = auth.uid() 
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = receiver_id)
    OR public.check_user_is_medical_professional(auth.uid())
  );

-- --- Storage Bucket RLS Policies ---
DROP POLICY IF EXISTS "Users and managers can access own medical docs" ON storage.objects;
DROP POLICY IF EXISTS "Authorized roles can access storage medical docs" ON storage.objects;
CREATE POLICY "Authorized roles can access storage medical docs" ON storage.objects
  FOR ALL USING (
    bucket_id = 'medical-docs' AND
    auth.role() = 'authenticated' AND (
      name LIKE 'inbody/' || auth.uid()::text || '/%' OR
      name LIKE 'docs/' || auth.uid()::text || '/%' OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id::text = split_part(name, '/', 2) AND (
          manager_id = auth.uid() 
          OR assigned_doctor_id = auth.uid()
          OR public.check_user_is_admin(auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users and managers can access chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users and doctors can access storage chat attachments" ON storage.objects;
CREATE POLICY "Users and doctors can access storage chat attachments" ON storage.objects
  FOR ALL USING (
    bucket_id = 'chat-attachments' AND
    auth.role() = 'authenticated' AND (
      name LIKE auth.uid()::text || '/%' OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id::text = split_part(name, '/', 1) AND (
          manager_id = auth.uid() 
          OR assigned_doctor_id = auth.uid()
          OR public.check_user_is_admin(auth.uid())
        )
      )
    )
  );

-- =========================================================================
-- 5. Enable Supabase Realtime for Crucial Tables
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'inquiries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inquiries;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
