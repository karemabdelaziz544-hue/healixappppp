-- Production billing and family-entitlement foundation.  This is deliberately
-- forward-only: legacy profile subscription fields remain populated while the
-- mobile clients move to the authoritative tables below.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A profile can represent either the signed-in account or a virtual family
-- member. Existing account profiles keep their current UUIDs, so existing FKs
-- and mobile payloads remain valid.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.profiles SET auth_user_id = id WHERE auth_user_id IS NULL AND manager_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_unique ON public.profiles(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_manager_id_idx ON public.profiles(manager_id);

CREATE OR REPLACE FUNCTION public.current_account_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() OR id = auth.uid() ORDER BY (auth_user_id = auth.uid()) DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.owns_profile(profile_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_uuid AND (auth_user_id = auth.uid() OR id = auth.uid()));
$$;

CREATE OR REPLACE FUNCTION public.manages_profile(profile_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_uuid AND manager_id = public.current_account_profile_id());
$$;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled_at_period_end','cancelled','expired')),
  cancelled_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_current_per_manager ON public.subscriptions(manager_id) WHERE status IN ('active','cancelled_at_period_end');

CREATE TABLE IF NOT EXISTS public.subscription_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','expired','cancelled')),
  source_payment_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_periods_subscription_ends_idx ON public.subscription_periods(subscription_id, ends_at DESC);

CREATE TABLE IF NOT EXISTS public.family_subscription_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_period_id uuid NOT NULL REFERENCES public.subscription_periods(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('included','excluded','expired','cancelled')),
  included_from timestamptz,
  included_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, subscription_period_id)
);
CREATE INDEX IF NOT EXISTS family_subscription_memberships_member_idx ON public.family_subscription_memberships(member_id, status);
CREATE INDEX IF NOT EXISTS family_subscription_memberships_manager_idx ON public.family_subscription_memberships(manager_id, status);

ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS expected_amount numeric;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS declared_transferred_amount numeric;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS admin_confirmed_amount numeric;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS previous_request_id uuid REFERENCES public.payment_requests(id);
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS attempt_group_id uuid;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS approved_subscription_id uuid REFERENCES public.subscriptions(id);
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_status_check;
ALTER TABLE public.payment_requests ADD CONSTRAINT payment_requests_status_check CHECK (status IN ('pending','approved','rejected','cancelled'));
UPDATE public.payment_requests SET expected_amount = amount WHERE expected_amount IS NULL;
UPDATE public.payment_requests SET attempt_group_id = id WHERE attempt_group_id IS NULL;
ALTER TABLE public.payment_requests ALTER COLUMN expected_amount SET NOT NULL;
ALTER TABLE public.payment_requests ALTER COLUMN attempt_group_id SET NOT NULL;
-- Keep the newest pending request. Older duplicates remain auditable and are
-- explicitly rejected rather than silently deleted.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS position
  FROM public.payment_requests WHERE status = 'pending'
)
UPDATE public.payment_requests request SET status = 'rejected', rejection_reason = 'Superseded by a newer payment request', reviewed_at = now()
FROM ranked WHERE request.id = ranked.id AND ranked.position > 1;
CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_one_pending_per_user ON public.payment_requests(user_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_invoice_number_unique ON public.payment_requests(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_requests_user_created_idx ON public.payment_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_requests_attempt_group_idx ON public.payment_requests(attempt_group_id, created_at DESC);

-- Backfill current paid customers into an auditable first subscription period.
INSERT INTO public.subscriptions (manager_id, status)
SELECT p.id, CASE WHEN p.subscription_status = 'active' THEN 'active' ELSE 'expired' END
FROM public.profiles p
WHERE p.manager_id IS NULL AND p.subscription_end_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.manager_id = p.id);

INSERT INTO public.subscription_periods (subscription_id, starts_at, ends_at, status)
SELECT s.id, p.subscription_end_date - interval '30 days', p.subscription_end_date,
       CASE WHEN p.subscription_status = 'active' AND p.subscription_end_date > now() THEN 'active' ELSE 'expired' END
FROM public.subscriptions s JOIN public.profiles p ON p.id = s.manager_id
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_periods sp WHERE sp.subscription_id = s.id);

INSERT INTO public.family_subscription_memberships (manager_id, member_id, subscription_period_id, status, included_from, included_until)
SELECT child.manager_id, child.id, period.id,
       CASE WHEN child.subscription_status = 'active' AND child.subscription_end_date > now() THEN 'included' ELSE 'expired' END,
       period.starts_at, period.ends_at
FROM public.profiles child
JOIN public.subscriptions s ON s.manager_id = child.manager_id
JOIN LATERAL (SELECT id, starts_at, ends_at FROM public.subscription_periods WHERE subscription_id = s.id ORDER BY ends_at DESC LIMIT 1) period ON true
WHERE child.manager_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.family_subscription_memberships f WHERE f.member_id = child.id AND f.subscription_period_id = period.id);

-- Client requests must never be able to alter payment state or evidence.
DROP POLICY IF EXISTS "Users and managers can view and submit payment requests" ON public.payment_requests;
CREATE POLICY "payment request owner or admin can read" ON public.payment_requests FOR SELECT
  USING (public.owns_profile(user_id) OR public.is_admin());
CREATE POLICY "payment requests are server created" ON public.payment_requests FOR INSERT WITH CHECK (false);
CREATE POLICY "payment requests are admin reviewed" ON public.payment_requests FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users and managers can access subscription receipts" ON storage.objects;
CREATE POLICY "receipt owner or admin may read" ON storage.objects FOR SELECT USING (
  bucket_id = 'receipts' AND (public.is_admin() OR EXISTS (SELECT 1 FROM public.payment_requests pr WHERE pr.receipt_url = name AND public.owns_profile(pr.user_id)))
);
CREATE POLICY "receipt uploads are server only" ON storage.objects FOR INSERT WITH CHECK (bucket_id <> 'receipts');

-- Profiles are still readable by the account, its family and admins, but
-- sensitive billing/role fields are protected by a trigger below.
DROP POLICY IF EXISTS "Users and admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or sub-account profiles" ON public.profiles;
CREATE POLICY "account family can update profile details" ON public.profiles FOR UPDATE
  USING (public.owns_profile(id) OR public.manages_profile(id) OR public.is_admin())
  WITH CHECK (public.owns_profile(id) OR public.manages_profile(id) OR public.is_admin());

CREATE OR REPLACE FUNCTION public.prevent_client_profile_privilege_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('healix.internal_action', true) = 'true' THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.manager_id IS DISTINCT FROM OLD.manager_id
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.assigned_doctor_id IS DISTINCT FROM OLD.assigned_doctor_id THEN
    RAISE EXCEPTION 'Protected profile fields can only be changed by an authorized server workflow';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_client_profile_privilege_changes();

-- Explicit medical access boundaries and an audit trail. Adult family members
-- need a consent row; a manager can manage minor children by default.
CREATE TABLE IF NOT EXISTS public.family_medical_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  revoked_at timestamptz,
  UNIQUE(member_id, manager_id)
);
CREATE TABLE IF NOT EXISTS public.medical_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  profile_id uuid,
  action text NOT NULL,
  actor_auth_user_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.can_manage_medical_profile(profile_uuid uuid, write_access boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.owns_profile(profile_uuid) OR public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles child
    LEFT JOIN public.family_medical_consents consent ON consent.member_id = child.id AND consent.manager_id = public.current_account_profile_id() AND consent.revoked_at IS NULL
    WHERE child.id = profile_uuid AND child.manager_id = public.current_account_profile_id()
      AND ((child.relation IN ('son','daughter') AND child.birth_date > current_date - interval '18 years')
           OR (CASE WHEN write_access THEN coalesce(consent.can_update,false) ELSE coalesce(consent.can_view,false) END))
  );
$$;
CREATE OR REPLACE FUNCTION public.audit_medical_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE record jsonb := to_jsonb(COALESCE(NEW, OLD));
BEGIN
  INSERT INTO public.medical_audit_log(table_name, record_id, profile_id, action, actor_auth_user_id)
  VALUES (TG_TABLE_NAME, (record->>'id')::uuid, (record->>'user_id')::uuid, TG_OP, auth.uid());
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create virtual profiles safely, with all quota and data validation enforced
-- in the database rather than in React Native.
DROP FUNCTION IF EXISTS public.create_sub_member;
CREATE OR REPLACE FUNCTION public.create_sub_member(member_name text, member_gender text, member_birth date, member_relation text, member_height numeric, member_weight numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE manager_uuid uuid := public.current_account_profile_id(); member_uuid uuid := gen_random_uuid(); current_period uuid; included_count integer; paid_count integer;
BEGIN
  IF manager_uuid IS NULL THEN RAISE EXCEPTION 'Authenticated manager profile is required'; END IF;
  SELECT sp.id INTO current_period FROM public.subscriptions s JOIN public.subscription_periods sp ON sp.subscription_id = s.id
   WHERE s.manager_id = manager_uuid AND s.status IN ('active','cancelled_at_period_end') AND sp.status = 'active' AND sp.ends_at > now() ORDER BY sp.ends_at DESC LIMIT 1;
  IF current_period IS NULL THEN RAISE EXCEPTION 'An active subscription is required'; END IF;
  SELECT count(*) INTO included_count FROM public.family_subscription_memberships WHERE subscription_period_id = current_period AND status = 'included';
  SELECT coalesce((pr.renewal_metadata->>'sub_count')::int, 0) INTO paid_count FROM public.payment_requests pr JOIN public.subscription_periods sp ON sp.source_payment_request_id = pr.id WHERE sp.id = current_period;
  IF included_count >= coalesce(paid_count, 0) THEN RAISE EXCEPTION 'Family member quota has been reached'; END IF;
  IF length(trim(coalesce(member_name,''))) < 2 OR member_gender NOT IN ('male','female') OR member_relation NOT IN ('son','daughter','husband','wife','brother','sister')
     OR member_height NOT BETWEEN 30 AND 250 OR member_weight NOT BETWEEN 2 AND 400 OR member_birth > current_date OR member_birth < current_date - interval '120 years' THEN
    RAISE EXCEPTION 'Invalid family member details';
  END IF;
  PERFORM set_config('healix.internal_action','true',true);
  INSERT INTO public.profiles(id, full_name, gender, birth_date, height, weight, manager_id, role, subscription_status, subscription_end_date, is_onboarded, relation)
  SELECT member_uuid, trim(member_name), member_gender, member_birth, member_height, member_weight, manager_uuid, 'client', 'active', sp.ends_at, false, member_relation FROM public.subscription_periods sp WHERE sp.id = current_period;
  INSERT INTO public.family_subscription_memberships(manager_id, member_id, subscription_period_id, status, included_from, included_until)
  SELECT manager_uuid, member_uuid, current_period, 'included', starts_at, ends_at FROM public.subscription_periods WHERE id = current_period;
  RETURN member_uuid;
END;
$$;
