-- =====================================================================
-- Migration: 20260804100000_enterprise_audit_logs.sql
-- Description: Centralized Enterprise Audit Logging System (Expanded)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_role TEXT,
  target_user_id UUID,
  target_profile_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexing for fast search, filterable queries, and pagination
CREATE INDEX IF NOT EXISTS enterprise_audit_actor_idx ON public.enterprise_audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS enterprise_audit_target_idx ON public.enterprise_audit_logs(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS enterprise_audit_action_entity_idx ON public.enterprise_audit_logs(action, entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS enterprise_audit_correlation_idx ON public.enterprise_audit_logs(correlation_id) WHERE correlation_id IS NOT NULL;

ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Admin can view all audit logs. Users can view logs where target_user_id is themselves.
DROP POLICY IF EXISTS "enterprise_audit_admin_read" ON public.enterprise_audit_logs;
CREATE POLICY "enterprise_audit_admin_read" ON public.enterprise_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin() OR target_user_id = auth.uid());

-- INSERT policy: Authenticated users/triggers can append audit records
DROP POLICY IF EXISTS "enterprise_audit_insert" ON public.enterprise_audit_logs;
CREATE POLICY "enterprise_audit_insert" ON public.enterprise_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Immutability: Prevent UPDATE or DELETE operations on audit logs
REVOKE UPDATE, DELETE ON public.enterprise_audit_logs FROM authenticated, anon;

-- Automatic audit log trigger function for sensitive table mutations
CREATE OR REPLACE FUNCTION public.audit_enterprise_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec jsonb := to_jsonb(COALESCE(NEW, OLD));
  actor_uuid uuid := auth.uid();
  actor_r text;
  target_u uuid;
  target_p uuid;
BEGIN
  SELECT role INTO actor_r FROM public.profiles WHERE (auth_user_id = actor_uuid OR id = actor_uuid) LIMIT 1;
  
  target_u := (rec->>'user_id')::uuid;
  IF target_u IS NULL THEN
    target_u := (rec->>'id')::uuid;
  END IF;
  
  target_p := (rec->>'profile_id')::uuid;

  INSERT INTO public.enterprise_audit_logs (
    actor_id,
    actor_role,
    target_user_id,
    target_profile_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value,
    created_at
  ) VALUES (
    actor_uuid,
    COALESCE(actor_r, 'client'),
    target_u,
    target_p,
    TG_OP,
    TG_TABLE_NAME,
    (rec->>'id')::uuid,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_enterprise_mutation();

DROP TRIGGER IF EXISTS audit_plans_trigger ON public.plans;
CREATE TRIGGER audit_plans_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.audit_enterprise_mutation();

DROP TRIGGER IF EXISTS audit_subscriptions_trigger ON public.subscriptions;
CREATE TRIGGER audit_subscriptions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.audit_enterprise_mutation();

DROP TRIGGER IF EXISTS audit_payment_requests_trigger ON public.payment_requests;
CREATE TRIGGER audit_payment_requests_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_enterprise_mutation();



DROP TRIGGER IF EXISTS audit_client_documents_trigger ON public.client_documents;
CREATE TRIGGER audit_client_documents_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_enterprise_mutation();

DROP TRIGGER IF EXISTS audit_inbody_records_trigger ON public.inbody_records;
CREATE TRIGGER audit_inbody_records_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inbody_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_enterprise_mutation();


