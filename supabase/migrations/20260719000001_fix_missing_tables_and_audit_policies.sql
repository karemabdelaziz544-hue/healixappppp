-- =========================================================================
-- Migration: 20260719000001_fix_missing_tables_and_audit_policies.sql
-- Description:
--   1. Create water_tracking table if not exists (fixing schema cache error)
--   2. Configure SELECT and INSERT security policies on medical_audit_log
-- =========================================================================

-- 1. Create water_tracking table if not exists
CREATE TABLE IF NOT EXISTS public.water_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on water_tracking
ALTER TABLE public.water_tracking ENABLE ROW LEVEL SECURITY;

-- Enable permissions policy on water_tracking
DROP POLICY IF EXISTS "Users and managers can access water tracking" ON public.water_tracking;
CREATE POLICY "Users and managers can access water tracking" ON public.water_tracking
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = water_tracking.user_id) OR
    public.check_user_is_medical_professional(auth.uid())
  );

-- 2. Configure SELECT policy on medical_audit_log
DROP POLICY IF EXISTS "medical audit owner or manager read" ON public.medical_audit_log;
CREATE POLICY "medical audit owner or manager read" ON public.medical_audit_log
  FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid() OR
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = profile_id) OR
    public.check_user_is_medical_professional(auth.uid())
  );

-- 3. Configure INSERT policy on medical_audit_log (allowing milestones logging)
DROP POLICY IF EXISTS "medical audit user insert" ON public.medical_audit_log;
CREATE POLICY "medical audit user insert" ON public.medical_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid() AND
    action = 'INSERT' AND
    table_name IN ('lifestyle_profile', 'activity_logs')
  );
