-- =====================================================================
-- Migration: 20260808300000_security_remediation.sql
-- Phase: P0 + P1 Security Hardening
-- Date: 2026-08-08
-- Description:
--   P0-1: Corrects can_manage_medical_profile() to scope doctor access to
--         ASSIGNED patients only (via profiles.assigned_doctor_id).
--         Eliminates the any-doctor access loophole introduced in 20260713000002.
--
--   P0-2: Corrects activity_logs and user_activity_goals RLS policies to
--         require assigned_doctor_id instead of any medical professional.
--
--   P1-1: Corrects enterprise_audit_logs INSERT policy to prevent clients
--         from directly forging audit records.
--
--   P1-2: Corrects visitor conversation SELECT policy so authenticated
--         users cannot enumerate all visitor PII.
--
--   P1-3: Corrects check_user_is_medical_professional() and check_user_is_admin()
--         to include SET search_path = public (FINDING-010).
--
-- Security Invariants enforced:
--   - A doctor may only access medical data for profiles where
--     profiles.assigned_doctor_id = auth.uid() (or the doctor's current_account_profile_id).
--   - Patients and family managers retain full access to their own data.
--   - Admins retain full access across all tables.
--   - Visitor conversations are readable only by admins; not by arbitrary authenticated users.
--   - Enterprise audit records are created exclusively by server-side triggers and
--     SECURITY DEFINER functions; direct client INSERT is denied.
-- =====================================================================


-- =====================================================================
-- SECTION 1: Fix can_manage_medical_profile()
-- =====================================================================
-- The version in 20260713000002 introduced an unscoped doctor role check:
--   OR EXISTS (SELECT 1 FROM profiles WHERE ... AND role = 'doctor')
-- This allowed ANY doctor to access ANY patient's medical data.
-- The corrected version requires profiles.assigned_doctor_id = auth.uid().
-- All downstream policies (inbody_records, health_profile, lifestyle_profile,
-- client_documents) use this function, so fixing the function fixes them all.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.can_manage_medical_profile(profile_uuid uuid, write_access boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    -- 1. The authenticated account owns the profile directly
    public.owns_profile(profile_uuid)
    -- 2. Platform admin has full access
    OR public.is_admin()
    -- 3. An ASSIGNED doctor (only) may access the patient's medical data
    --    Checks both auth_user_id and id to handle dual-identity doctor profiles
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = profile_uuid
        AND (
          assigned_doctor_id = auth.uid()
          OR assigned_doctor_id = public.current_account_profile_id()
        )
    )
    -- 4. Authorized family manager with appropriate consent/relationship
    --    (minor children or consented adult members)
    OR EXISTS (
      SELECT 1 FROM public.profiles child
      LEFT JOIN public.family_medical_consents consent
        ON consent.member_id = child.id
        AND consent.manager_id = public.current_account_profile_id()
        AND consent.revoked_at IS NULL
      WHERE child.id = profile_uuid
        AND child.manager_id = public.current_account_profile_id()
        AND (
          -- Minor child (under 18): always accessible by manager
          (child.relation IN ('son','daughter') AND child.birth_date > current_date - interval '18 years')
          -- Adult member: requires explicit consent grant
          OR (CASE WHEN write_access THEN coalesce(consent.can_update, false) ELSE coalesce(consent.can_view, false) END)
        )
    );
$$;

-- Confirm the function was recreated correctly
COMMENT ON FUNCTION public.can_manage_medical_profile(uuid, boolean) IS
  'Returns true if the current session is authorized to access a medical profile. '
  'Grants access to: the profile owner, platform admins, the ASSIGNED doctor only, '
  'and authorized family managers. Unassigned doctors are explicitly DENIED.';


-- =====================================================================
-- SECTION 2: Fix activity_logs and user_activity_goals RLS
-- =====================================================================
-- The 20260719000000 migration used check_user_is_medical_professional(auth.uid())
-- which grants ANY doctor access to ANY user's activity data.
-- These policies now require assigned_doctor_id, matching the pattern in
-- can_manage_medical_profile().
-- =====================================================================

-- Activity Logs: Replace the any-doctor policy with assigned-doctor-only
DROP POLICY IF EXISTS "Users, managers, and doctors can access activity logs" ON public.activity_logs;
CREATE POLICY "activity_logs_authorized_access" ON public.activity_logs
  FOR ALL TO authenticated
  USING (
    -- User's own logs
    user_id = auth.uid()
    -- Family manager can access managed member's logs
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = activity_logs.user_id)
    -- ASSIGNED doctor only (not any doctor)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = activity_logs.user_id
        AND (
          assigned_doctor_id = auth.uid()
          OR assigned_doctor_id = public.current_account_profile_id()
        )
    )
    -- Admin full access
    OR public.is_admin()
  );

-- User Activity Goals: Replace the any-doctor policy with assigned-doctor-only
DROP POLICY IF EXISTS "Users, managers, and doctors can access user activity goals" ON public.user_activity_goals;
CREATE POLICY "user_activity_goals_authorized_access" ON public.user_activity_goals
  FOR ALL TO authenticated
  USING (
    -- User's own goals
    user_id = auth.uid()
    -- Family manager can access managed member's goals
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = user_activity_goals.user_id)
    -- ASSIGNED doctor only
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_activity_goals.user_id
        AND (
          assigned_doctor_id = auth.uid()
          OR assigned_doctor_id = public.current_account_profile_id()
        )
    )
    -- Admin full access
    OR public.is_admin()
  );


-- =====================================================================
-- SECTION 3: Fix enterprise_audit_logs INSERT policy
-- =====================================================================
-- The 20260804100000 migration set WITH CHECK (true), allowing any
-- authenticated user to forge audit records (arbitrary actor_id, action, etc.).
-- Audit logs are created exclusively by SECURITY DEFINER triggers.
-- Direct INSERT from authenticated clients must be blocked.
-- SECURITY DEFINER functions (triggers) bypass RLS entirely, so blocking
-- client INSERT does not break the trigger-based audit logging system.
-- =====================================================================

DROP POLICY IF EXISTS "enterprise_audit_insert" ON public.enterprise_audit_logs;
-- No INSERT policy = RLS blocks all direct INSERT attempts from authenticated/anon roles.
-- SECURITY DEFINER triggers are exempt from RLS and will continue to insert correctly.

-- Explicitly revoke INSERT privilege from authenticated role as defense-in-depth
-- (RLS + privilege revocation = two independent layers)
REVOKE INSERT ON public.enterprise_audit_logs FROM authenticated;

-- Re-grant INSERT to the service role only (edge functions, triggers run as superuser/service role)
-- Note: SECURITY DEFINER functions run as the function owner (postgres/service role),
-- so this grant is for explicit edge function service-role client usage if needed.
GRANT INSERT ON public.enterprise_audit_logs TO service_role;

COMMENT ON TABLE public.enterprise_audit_logs IS
  'Enterprise audit log. INSERT is restricted to SECURITY DEFINER triggers and service_role. '
  'Authenticated clients cannot directly insert records. UPDATE and DELETE are revoked for all.';


-- =====================================================================
-- SECTION 4: Fix visitor conversation SELECT RLS
-- =====================================================================
-- 20260714000004 made ALL visitor conversations readable by ALL authenticated
-- users via the blanket `owner_type = 'visitor'` clause.
-- This exposed visitor PII (name, phone, email, inquiry subject) to every user.
-- The corrected policy: visitors cannot be enumerated by authenticated users.
-- Visitor conversations are accessible by: the owning admin/support, or
-- only through the visitor token validation (done server-side in upload-visitor-attachment).
-- The visitor widget reads its own conversation by matching visitor_token client-side
-- without authentication — that flow is handled by the edge function, not direct DB queries.
-- =====================================================================

DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
CREATE POLICY "conversations_select_policy" ON public.conversations
  FOR SELECT USING (
    -- Registered customer can see their own conversation
    owner_profile_id = auth.uid()
    -- Family manager can see managed member conversations
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = conversations.owner_profile_id)
    -- Admin/support can see all conversations (both customer and visitor)
    OR public.is_admin()
    -- NOTE: Visitor conversations are intentionally NOT accessible by arbitrary
    -- authenticated users. Visitor-side access is handled via the
    -- upload-visitor-attachment edge function using visitor_token validation
    -- (server-side, no direct DB query from anon client).
  );

DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;
CREATE POLICY "conversations_update_policy" ON public.conversations
  FOR UPDATE USING (
    -- Customer owns their conversation
    owner_profile_id = auth.uid()
    -- Admin/support can update any conversation (e.g., assign agent, close)
    OR public.is_admin()
    -- Visitor updates (status changes) handled by edge function using service role
    -- Do NOT allow arbitrary authenticated users to update visitor conversations
  );

-- Fix the messages SELECT policy to not expose visitor conversation messages
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy" ON public.messages
  FOR SELECT USING (
    -- Message belongs to customer's own conversation
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.owner_profile_id = auth.uid()
        OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = c.owner_profile_id)
        OR public.is_admin()
        -- Visitor conversation messages: NOT exposed to arbitrary authenticated users
        -- Visitor reads its own messages via edge function service-role client
      )
    )
    -- Fallback for legacy direct messages (inquiries) without conversation_id
    OR sender_id = auth.uid()
    OR receiver_id = auth.uid()
  );

-- Fix the messages INSERT policy (visitor sending messages must go through edge function)
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy" ON public.messages
  FOR INSERT WITH CHECK (
    -- Message belongs to a customer conversation the user owns
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.owner_profile_id = auth.uid()
        OR public.is_admin()
        -- Visitor inserts handled by edge function via service_role — not direct client
      )
    )
    -- Legacy fallback for direct messages (sender_id set by RLS-verified user)
    OR sender_id = auth.uid()
  );

COMMENT ON POLICY "conversations_select_policy" ON public.conversations IS
  'Authenticated users can only see their own customer conversations or admin sees all. '
  'Visitor conversations are NOT enumerable by arbitrary authenticated users. '
  'Visitor-side access is handled by the upload-visitor-attachment edge function.';


-- =====================================================================
-- SECTION 5: Fix check_user_is_medical_professional() and check_user_is_admin()
-- =====================================================================
-- These SECURITY DEFINER functions were missing SET search_path = public.
-- Without it, a malicious schema object could redirect the profiles lookup.
-- Fix: add SET search_path = public. No behavioral change.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.check_user_is_medical_professional(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('admin', 'doctor')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

COMMENT ON FUNCTION public.check_user_is_medical_professional(uuid) IS
  'Returns true if the given user_id belongs to a doctor or admin profile. '
  'Used in legacy RLS policies. Note: prefer can_manage_medical_profile() '
  'for medical data access which enforces assigned_doctor_id.';

COMMENT ON FUNCTION public.check_user_is_admin(uuid) IS
  'Returns true if the given user_id belongs to an admin profile. '
  'Hardened with SET search_path = public.';


-- =====================================================================
-- SECTION 6: Fix admin_clients_view defense-in-depth protection (FINDING-011)
-- =====================================================================
-- admin_clients_view in 20260714000000 lacked an explicit is_admin() filter.
-- Adding WHERE p.role = 'client' AND public.is_admin() ensures non-admins
-- querying this view will always receive 0 rows, matching admin_payment_requests_view.
-- =====================================================================

DROP VIEW IF EXISTS public.admin_clients_view CASCADE;

CREATE OR REPLACE VIEW public.admin_clients_view AS
SELECT 
  p.id,
  p.avatar_url,
  p.full_name,
  p.manager_id,
  m.full_name AS manager_name,
  p.phone,
  p.role,
  p.subscription_status,
  p.subscription_end_date,
  p.assigned_doctor_id
FROM public.profiles p
LEFT JOIN public.profiles m ON p.manager_id = m.id
WHERE p.role = 'client' AND public.is_admin();

GRANT SELECT ON public.admin_clients_view TO authenticated;

COMMENT ON VIEW public.admin_clients_view IS
  'Admin-only client overview. Contains WHERE public.is_admin() defense-in-depth filter.';

