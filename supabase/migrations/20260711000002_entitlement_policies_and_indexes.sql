-- Access policies for the new authoritative entitlement data and medical
-- records. These replace permissive FOR ALL manager policies.

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_subscription_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_medical_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription owner or admin read" ON public.subscriptions FOR SELECT USING (public.owns_profile(manager_id) OR public.is_admin());
CREATE POLICY "subscription periods owner or admin read" ON public.subscription_periods FOR SELECT USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id=subscription_id AND (public.owns_profile(s.manager_id) OR public.is_admin())));
CREATE POLICY "family entitlement account read" ON public.family_subscription_memberships FOR SELECT USING (public.owns_profile(manager_id) OR public.manages_profile(member_id) OR public.is_admin());
CREATE POLICY "medical consent family read" ON public.family_medical_consents FOR SELECT USING (public.owns_profile(member_id) OR public.owns_profile(manager_id) OR public.is_admin());
CREATE POLICY "medical consent member update" ON public.family_medical_consents FOR UPDATE USING (public.owns_profile(member_id) OR public.is_admin()) WITH CHECK (public.owns_profile(member_id) OR public.is_admin());
CREATE POLICY "medical audit admin read" ON public.medical_audit_log FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Authorized roles can access InBody records" ON public.inbody_records;
DROP POLICY IF EXISTS "Users and managers can access inbody records" ON public.inbody_records;
DROP POLICY IF EXISTS "Authorized roles can access client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users and managers can access client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Authorized roles can access health profile" ON public.health_profile;
DROP POLICY IF EXISTS "Users and managers can access health profile" ON public.health_profile;
DROP POLICY IF EXISTS "Authorized roles can access lifestyle profile" ON public.lifestyle_profile;
DROP POLICY IF EXISTS "Users and managers can access lifestyle profile" ON public.lifestyle_profile;

CREATE POLICY "medical records may be read by authorized care" ON public.inbody_records FOR SELECT USING (public.can_manage_medical_profile(user_id, false));
CREATE POLICY "medical records may be written by authorized care" ON public.inbody_records FOR ALL USING (public.can_manage_medical_profile(user_id, true)) WITH CHECK (public.can_manage_medical_profile(user_id, true));
CREATE POLICY "documents may be read by authorized care" ON public.client_documents FOR SELECT USING (public.can_manage_medical_profile(user_id, false));
CREATE POLICY "documents may be written by authorized care" ON public.client_documents FOR ALL USING (public.can_manage_medical_profile(user_id, true)) WITH CHECK (public.can_manage_medical_profile(user_id, true));
CREATE POLICY "health profile may be read by authorized care" ON public.health_profile FOR SELECT USING (public.can_manage_medical_profile(user_id, false));
CREATE POLICY "health profile may be written by authorized care" ON public.health_profile FOR ALL USING (public.can_manage_medical_profile(user_id, true)) WITH CHECK (public.can_manage_medical_profile(user_id, true));
CREATE POLICY "lifestyle profile may be read by authorized care" ON public.lifestyle_profile FOR SELECT USING (public.can_manage_medical_profile(user_id, false));
CREATE POLICY "lifestyle profile may be written by authorized care" ON public.lifestyle_profile FOR ALL USING (public.can_manage_medical_profile(user_id, true)) WITH CHECK (public.can_manage_medical_profile(user_id, true));

DROP TRIGGER IF EXISTS audit_inbody_records ON public.inbody_records;
DROP TRIGGER IF EXISTS audit_client_documents ON public.client_documents;
DROP TRIGGER IF EXISTS audit_health_profile ON public.health_profile;
DROP TRIGGER IF EXISTS audit_lifestyle_profile ON public.lifestyle_profile;
CREATE TRIGGER audit_inbody_records AFTER INSERT OR UPDATE OR DELETE ON public.inbody_records FOR EACH ROW EXECUTE FUNCTION public.audit_medical_mutation();
CREATE TRIGGER audit_client_documents AFTER INSERT OR UPDATE OR DELETE ON public.client_documents FOR EACH ROW EXECUTE FUNCTION public.audit_medical_mutation();
CREATE TRIGGER audit_health_profile AFTER INSERT OR UPDATE OR DELETE ON public.health_profile FOR EACH ROW EXECUTE FUNCTION public.audit_medical_mutation();
CREATE TRIGGER audit_lifestyle_profile AFTER INSERT OR UPDATE OR DELETE ON public.lifestyle_profile FOR EACH ROW EXECUTE FUNCTION public.audit_medical_mutation();

CREATE INDEX IF NOT EXISTS plans_user_id_idx ON public.plans(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inbody_records_user_created_idx ON public.inbody_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS client_documents_user_created_idx ON public.client_documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS daily_logs_user_date_idx ON public.daily_logs(user_id, date DESC);
