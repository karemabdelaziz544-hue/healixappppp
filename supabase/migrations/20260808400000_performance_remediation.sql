-- =====================================================================
-- Migration: 20260808400000_performance_remediation.sql
-- Description: Performance hardening, N+1 query RPCs, and RLS fixes
-- =====================================================================

-- =====================================================================
-- 1. ADD MISSING INDEXES
-- =====================================================================

-- Optimize conversation list loading for users
CREATE INDEX IF NOT EXISTS idx_conversations_owner_updated 
  ON public.conversations(owner_profile_id, updated_at DESC);

-- Optimize visitor token lookup for visitor attachment authorization
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_visitor_token 
  ON public.conversations(visitor_token) 
  WHERE visitor_token IS NOT NULL;

-- Optimize inquiries list filtering
CREATE INDEX IF NOT EXISTS idx_inquiries_user_status 
  ON public.inquiries(user_id, status);

-- =====================================================================
-- 2. N+1 QUERY FIX: AssistantOnboardingView
-- =====================================================================

-- Consolidates 4 separate network requests into 1 server-side RPC.
-- Uses SECURITY INVOKER so it executes with the caller's privileges (RLS is inherently enforced).
CREATE OR REPLACE FUNCTION public.get_user_onboarding_status(target_uid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_has_inbody BOOLEAN;
  v_has_health_profile BOOLEAN;
  v_has_lifestyle_profile BOOLEAN;
  v_has_client_documents BOOLEAN;
  v_result JSONB;
BEGIN
  -- Defense in depth: Verify caller is authorized to view this profile (self, manager, doctor, admin)
  IF target_uid != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = target_uid 
      AND (manager_id = auth.uid() OR assigned_doctor_id = auth.uid())
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Cross-user access denied';
  END IF;

  -- 1. Check inbody_records
  SELECT EXISTS (
    SELECT 1 FROM public.inbody_records WHERE user_id = target_uid
  ) INTO v_has_inbody;

  -- 2. Check health_profile
  SELECT EXISTS (
    SELECT 1 FROM public.health_profile WHERE user_id = target_uid
  ) INTO v_has_health_profile;

  -- 3. Check lifestyle_profile
  SELECT EXISTS (
    SELECT 1 FROM public.lifestyle_profile WHERE user_id = target_uid
  ) INTO v_has_lifestyle_profile;

  -- 4. Check client_documents
  SELECT EXISTS (
    SELECT 1 FROM public.client_documents WHERE user_id = target_uid
  ) INTO v_has_client_documents;

  v_result := jsonb_build_object(
    'has_inbody', v_has_inbody,
    'has_health_profile', v_has_health_profile,
    'has_lifestyle_profile', v_has_lifestyle_profile,
    'has_client_documents', v_has_client_documents
  );

  RETURN v_result;
END;
$$;

-- =====================================================================
-- 3. CHAT QUERY WATERFALL FIX
-- =====================================================================

-- Resolves the target chat receiver in one round-trip for useChatPagination
CREATE OR REPLACE FUNCTION public.get_chat_receiver(p_inquiry_id TEXT, p_current_uid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_receiver_id UUID;
  v_receiver_last_seen TIMESTAMP WITH TIME ZONE;
  v_assigned_doctor_id UUID;
BEGIN
  -- Defense in depth: Verify caller is not forging the p_current_uid
  IF p_current_uid != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Cross-user access denied';
  END IF;

  IF p_inquiry_id = 'support' THEN
    -- Find an admin
    SELECT id, updated_at INTO v_receiver_id, v_receiver_last_seen
    FROM public.profiles
    WHERE role = 'admin'
    LIMIT 1;
  ELSE
    -- Find assigned doctor for medical inquiries
    SELECT assigned_doctor_id INTO v_assigned_doctor_id
    FROM public.profiles
    WHERE id = p_current_uid;
    
    IF v_assigned_doctor_id IS NOT NULL THEN
      SELECT id, updated_at INTO v_receiver_id, v_receiver_last_seen
      FROM public.profiles
      WHERE id = v_assigned_doctor_id;
    END IF;
    
    -- Fallback to any doctor if unassigned (matching existing logic)
    IF v_receiver_id IS NULL THEN
      SELECT id, updated_at INTO v_receiver_id, v_receiver_last_seen
      FROM public.profiles
      WHERE role = 'doctor'
      LIMIT 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'receiver_id', v_receiver_id,
    'last_seen', v_receiver_last_seen
  );
END;
$$;

-- =====================================================================
-- 4. BACKGROUND JOB QUEUE: FOR UPDATE SKIP LOCKED
-- =====================================================================

-- Provides safe concurrent job claiming for the notification worker
-- Requires SECURITY DEFINER to bypass RLS for the service worker, but we'll grant it strictly to service_role or authenticated if needed. 
-- Assuming Edge Function uses service_role key to invoke this.
CREATE OR REPLACE FUNCTION public.claim_notification_jobs(p_batch_size INT)
RETURNS SETOF public.notification_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.notification_queue
  SET 
    status = 'sending',
    updated_at = now()
  WHERE id IN (
    SELECT id 
    FROM public.notification_queue
    WHERE (status IN ('pending', 'failed') AND next_retry_at <= now() AND retry_count < max_retries)
       OR (status = 'sending' AND updated_at < now() - INTERVAL '5 minutes')
    ORDER BY next_retry_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_batch_size
  )
  RETURNING *;
END;
$$;

-- Ensure we only allow service role to execute this
REVOKE EXECUTE ON FUNCTION public.claim_notification_jobs(INT) FROM public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.claim_notification_jobs(INT) TO service_role;

-- We need to make sure updated_at exists on notification_queue. The previous audit said it didn't list it, let's add it if missing.
ALTER TABLE public.notification_queue 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- =====================================================================
-- 5. RLS LOOPHOLE FIX: inquiries
-- =====================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "inquiries_select_policy" ON public.inquiries;

-- Recreate with strict boundaries:
-- 1. Inquiry owner (user_id = auth.uid())
-- 2. Authorized manager
-- 3. Assigned doctor ONLY (not any doctor)
-- 4. Admin
CREATE POLICY "inquiries_select_policy" ON public.inquiries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = inquiries.user_id)
    OR auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = inquiries.user_id)
    OR public.is_admin()
  );

-- =====================================================================
-- 6. DATABASE ARCHIVAL STRATEGY (Documentation)
-- =====================================================================
/*
  Retention Strategy Documented for High-Growth Tables:
  
  1. enterprise_audit_logs: 
     - Retention: 7 years (regulatory requirement for healthcare/enterprise audits).
     - Architecture: Currently a single table. At 1M users, we recommend setting up pg_partman
       to partition this table BY RANGE (created_at) on a monthly basis, retaining partitions for 84 months.
  
  2. activity_logs & daily_task_logs:
     - Retention: 1 year of high-resolution daily telemetry.
     - Archival: Older telemetry can be summarized into monthly aggregates and original rows deleted,
       or moved to a cold-storage S3 bucket via Edge Functions before deletion.
  
  3. ai_usage_logs:
     - Retention: 90 days.
     - Archival: A periodic pg_cron job should execute `DELETE FROM ai_usage_logs WHERE created_at < NOW() - INTERVAL '90 days';`
       This prevents unbounded growth for operational metadata.
*/
