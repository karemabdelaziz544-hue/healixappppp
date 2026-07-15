-- =========================================================================
-- Healix Subscription System Refactor
-- =========================================================================
-- This migration redesigns the subscription domain while preserving all
-- existing security infrastructure (RLS, triggers, indexes, audit trails).
--
-- Changes:
--   1. Fix pricing: 150 → 250 EGP per sub-account
--   2. Add first-class columns: family_quota, payment_type, etc.
--   3. Replace RPCs with full lifecycle support (13 states)
--   4. Backfill existing data
-- =========================================================================

-- =========================================================================
-- 1. Fix subscription pricing (250 EGP per sub-account, not 150)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.subscription_price(sub_count integer)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF sub_count < 0 OR sub_count > 20 THEN RAISE EXCEPTION 'Invalid family member count'; END IF;
  RETURN 500 + (sub_count * 250);
END;
$$;

-- =========================================================================
-- 2. Add first-class columns to subscriptions table
-- =========================================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS family_quota integer NOT NULL DEFAULT 0;

-- =========================================================================
-- 3. Add payment_type and structured fields to payment_requests
-- =========================================================================
-- payment_type discriminates new/renewal/upgrade/downgrade
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'new';

-- Drop constraint if it exists, then add with all valid values
ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_payment_type_check;
ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_payment_type_check
  CHECK (payment_type IN ('new','renewal','upgrade','downgrade'));

-- Structured columns to replace JSON metadata dependency
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS requested_family_quota integer NOT NULL DEFAULT 0;

ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS keep_member_ids uuid[] NOT NULL DEFAULT '{}';

-- =========================================================================
-- 4. Backfill existing data from JSON metadata
-- =========================================================================

-- Backfill requested_family_quota from renewal_metadata->>'sub_count'
UPDATE public.payment_requests
SET requested_family_quota = COALESCE((renewal_metadata->>'sub_count')::int, 0)
WHERE requested_family_quota = 0 AND renewal_metadata IS NOT NULL
  AND renewal_metadata->>'sub_count' IS NOT NULL;

-- Backfill keep_member_ids from renewal_metadata->'keep_member_ids'
UPDATE public.payment_requests
SET keep_member_ids = COALESCE(
  ARRAY(SELECT jsonb_array_elements_text(
    COALESCE(renewal_metadata->'keep_member_ids', '[]'::jsonb)
  )::uuid),
  '{}'::uuid[]
)
WHERE keep_member_ids = '{}' AND renewal_metadata IS NOT NULL
  AND renewal_metadata->'keep_member_ids' IS NOT NULL
  AND jsonb_array_length(COALESCE(renewal_metadata->'keep_member_ids', '[]'::jsonb)) > 0;

-- Backfill payment_type: infer from context
-- If there was a previous subscription period when request was created, it's a renewal
UPDATE public.payment_requests pr
SET payment_type = 'renewal'
WHERE pr.payment_type = 'new'
  AND pr.status = 'approved'
  AND EXISTS (
    SELECT 1 FROM public.subscription_periods sp
    JOIN public.subscriptions s ON s.id = sp.subscription_id
    WHERE s.manager_id = pr.user_id
      AND sp.source_payment_request_id != pr.id
  );

-- Backfill family_quota on subscriptions from latest approved payment
UPDATE public.subscriptions s
SET family_quota = COALESCE(
  (SELECT pr.requested_family_quota
   FROM public.subscription_periods sp
   JOIN public.payment_requests pr ON pr.id = sp.source_payment_request_id
   WHERE sp.subscription_id = s.id AND sp.status = 'active'
   ORDER BY sp.ends_at DESC LIMIT 1),
  -- Fallback: count current included members in the latest active period
  (SELECT COALESCE(count(*)::int, 0)
   FROM public.family_subscription_memberships fm
   WHERE fm.subscription_period_id = (
     SELECT sp.id FROM public.subscription_periods sp
     WHERE sp.subscription_id = s.id AND sp.status = 'active'
     ORDER BY sp.ends_at DESC LIMIT 1
   ) AND fm.status = 'included'),
  0
);

-- =========================================================================
-- 5. Replace profile_subscription_state() with full lifecycle
-- =========================================================================
CREATE OR REPLACE FUNCTION public.profile_subscription_state(profile_uuid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    -- Admin/doctor bypass
    WHEN public.is_admin() THEN 'admin'

    -- ─── Family member states ───
    WHEN p.manager_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.family_subscription_memberships fm
      JOIN public.subscription_periods sp ON sp.id = fm.subscription_period_id
      WHERE fm.member_id = p.id AND fm.status = 'included'
        AND sp.status = 'active' AND sp.ends_at > now()
    ) THEN 'family_active'

    WHEN p.manager_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.family_subscription_memberships fm
      WHERE fm.member_id = p.id AND fm.status = 'excluded'
    ) THEN 'family_removed'

    WHEN p.manager_id IS NOT NULL THEN 'family_expired'

    -- ─── Payment states with type awareness ───
    WHEN EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.user_id = p.id AND pr.status = 'pending' AND pr.payment_type = 'upgrade'
    ) THEN 'upgrade_pending'

    WHEN EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.user_id = p.id AND pr.status = 'pending' AND pr.payment_type = 'downgrade'
    ) THEN 'downgrade_pending'

    WHEN EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.user_id = p.id AND pr.status = 'pending' AND pr.payment_type = 'renewal'
    ) THEN 'renewing'

    WHEN EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.user_id = p.id AND pr.status = 'pending'
    ) THEN 'pending_review'

    WHEN EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.user_id = p.id AND pr.status = 'rejected'
        AND NOT EXISTS (
          SELECT 1 FROM public.payment_requests pr2
          WHERE pr2.user_id = p.id AND pr2.status IN ('pending','approved')
            AND pr2.created_at > pr.created_at
        )
    ) THEN 'rejected'

    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.manager_id = p.id AND s.status = 'cancelled'
        AND NOT EXISTS (
          SELECT 1 FROM public.subscriptions s2
          WHERE s2.manager_id = p.id AND s2.status IN ('active','cancelled_at_period_end')
        )
    ) THEN 'cancelled'

    -- ─── Active states ───
    -- Expiring soon: active but within 7 days of expiry
    WHEN EXISTS (
      SELECT 1 FROM public.subscription_periods sp
      JOIN public.subscriptions s ON s.id = sp.subscription_id
      WHERE s.manager_id = p.id AND sp.status = 'active'
        AND sp.ends_at > now() AND sp.ends_at <= now() + interval '7 days'
    ) THEN 'expiring_soon'

    -- Active subscription
    WHEN EXISTS (
      SELECT 1 FROM public.subscription_periods sp
      JOIN public.subscriptions s ON s.id = sp.subscription_id
      WHERE s.manager_id = p.id AND sp.status = 'active' AND sp.ends_at > now()
    ) THEN 'active'

    -- ─── Expired: had subscription before ───
    WHEN EXISTS (
      SELECT 1 FROM public.subscription_periods sp
      JOIN public.subscriptions s ON s.id = sp.subscription_id
      WHERE s.manager_id = p.id
    ) THEN 'expired'

    -- ─── Never subscribed ───
    ELSE 'no_subscription'
  END
  FROM public.profiles p WHERE p.id = profile_uuid;
$$;

-- =========================================================================
-- 6. Update subscription_entitlements view
-- =========================================================================
CREATE OR REPLACE VIEW public.subscription_entitlements WITH (security_invoker = true) AS
SELECT
  p.id AS profile_id,
  p.manager_id,
  public.profile_subscription_state(p.id) AS access_state,
  (SELECT max(sp.ends_at)
   FROM public.subscription_periods sp
   JOIN public.subscriptions s ON s.id = sp.subscription_id
   WHERE s.manager_id = coalesce(p.manager_id, p.id) AND sp.status = 'active'
  ) AS ends_at,
  (SELECT s.family_quota
   FROM public.subscriptions s
   WHERE s.manager_id = coalesce(p.manager_id, p.id)
     AND s.status IN ('active','cancelled_at_period_end')
   LIMIT 1
  ) AS family_quota
FROM public.profiles p;

-- =========================================================================
-- 7. Replace create_payment_request() with type-aware version
-- =========================================================================
CREATE OR REPLACE FUNCTION public.create_payment_request(
  p_receipt_path text,
  p_sub_count integer,
  p_payment_type text DEFAULT 'new',
  p_keep_member_ids uuid[] DEFAULT '{}',
  p_declared_transferred_amount numeric DEFAULT NULL,
  p_previous_request_id uuid DEFAULT NULL
)
RETURNS public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  manager_uuid uuid := public.current_account_profile_id();
  expected numeric;
  request_row public.payment_requests;
  attempt_uuid uuid;
  current_quota integer;
BEGIN
  -- Validate auth
  IF manager_uuid IS NULL OR NOT public.owns_profile(manager_uuid) THEN
    RAISE EXCEPTION 'Only the authenticated account owner can submit a payment request';
  END IF;

  -- Validate receipt path
  IF p_receipt_path IS NULL OR p_receipt_path !~ ('^receipts/' || manager_uuid::text || '/[0-9a-f-]+\.(jpg|jpeg|png|heic|pdf)$') THEN
    RAISE EXCEPTION 'Invalid receipt path';
  END IF;

  -- Validate payment type
  IF p_payment_type NOT IN ('new','renewal','upgrade','downgrade') THEN
    RAISE EXCEPTION 'Invalid payment type';
  END IF;

  -- Calculate expected price from backend
  expected := public.subscription_price(p_sub_count);

  -- Validate declared amount
  IF p_declared_transferred_amount IS NOT NULL AND p_declared_transferred_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid declared amount';
  END IF;

  -- Ensure no duplicate pending request
  IF EXISTS (SELECT 1 FROM public.payment_requests WHERE user_id = manager_uuid AND status = 'pending') THEN
    RAISE EXCEPTION 'A payment request is already pending';
  END IF;

  -- Validate retry reference
  IF p_previous_request_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.payment_requests WHERE id = p_previous_request_id AND user_id = manager_uuid AND status = 'rejected'
  ) THEN
    RAISE EXCEPTION 'Invalid retry request';
  END IF;

  -- Validate keep_member_ids belong to manager
  IF EXISTS (
    SELECT 1 FROM unnest(p_keep_member_ids) member_id
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = member_id AND manager_id = manager_uuid)
  ) THEN
    RAISE EXCEPTION 'A selected family member is invalid';
  END IF;

  -- Validate member count vs quota
  IF cardinality(p_keep_member_ids) > p_sub_count THEN
    RAISE EXCEPTION 'Selected members exceed requested quota';
  END IF;

  -- Validate payment type context
  SELECT coalesce(s.family_quota, 0) INTO current_quota
  FROM public.subscriptions s
  WHERE s.manager_id = manager_uuid AND s.status IN ('active','cancelled_at_period_end','cancelled','expired')
  LIMIT 1;

  IF p_payment_type = 'upgrade' AND p_sub_count <= coalesce(current_quota, 0) THEN
    RAISE EXCEPTION 'Upgrade requires more family members than current quota';
  END IF;

  IF p_payment_type = 'downgrade' THEN
    IF p_sub_count >= coalesce(current_quota, 0) THEN
      RAISE EXCEPTION 'Downgrade requires fewer family members than current quota';
    END IF;
    -- Must select exactly p_sub_count members to keep
    IF cardinality(p_keep_member_ids) != p_sub_count THEN
      RAISE EXCEPTION 'Downgrade requires selecting exactly the members to keep';
    END IF;
  END IF;

  -- Build attempt group
  SELECT coalesce(attempt_group_id, id) INTO attempt_uuid
  FROM public.payment_requests WHERE id = p_previous_request_id;

  -- Insert the payment request
  INSERT INTO public.payment_requests(
    user_id, amount, expected_amount, declared_transferred_amount,
    plan_type, status, receipt_url,
    renewal_metadata, previous_request_id, attempt_group_id, invoice_number,
    payment_type, requested_family_quota, keep_member_ids
  )
  VALUES (
    manager_uuid, expected, expected, p_declared_transferred_amount,
    'helix_integrated', 'pending', p_receipt_path,
    jsonb_build_object(
      'sub_count', p_sub_count,
      'keep_member_ids', to_jsonb(p_keep_member_ids),
      'action_type', p_payment_type
    ),
    p_previous_request_id,
    coalesce(attempt_uuid, gen_random_uuid()),
    'REQ-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text,1,8)),
    p_payment_type,
    p_sub_count,
    p_keep_member_ids
  )
  RETURNING * INTO request_row;

  RETURN request_row;
END;
$$;

-- =========================================================================
-- 8. Replace admin_approve_payment_request() with quota-aware version
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_approve_payment_request(
  p_request_id uuid,
  p_confirmed_amount numeric DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
)
RETURNS public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  request_row public.payment_requests;
  subscription_uuid uuid;
  period_uuid uuid;
  manager_uuid uuid;
  start_at timestamptz;
  end_at timestamptz;
  paid_count integer;
  selected_ids uuid[];
  req_payment_type text;
  old_ends_at timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin permission is required';
  END IF;

  SELECT * INTO request_row FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment request not found'; END IF;
  IF request_row.status <> 'pending' THEN RAISE EXCEPTION 'Only pending payment requests can be approved'; END IF;

  manager_uuid := request_row.user_id;
  paid_count := request_row.requested_family_quota;
  selected_ids := request_row.keep_member_ids;
  req_payment_type := request_row.payment_type;

  IF cardinality(selected_ids) > paid_count THEN
    RAISE EXCEPTION 'Payment request quota is invalid';
  END IF;

  -- Get or create subscription
  SELECT id INTO subscription_uuid
  FROM public.subscriptions
  WHERE manager_id = manager_uuid AND status IN ('active','cancelled_at_period_end','cancelled','expired')
  FOR UPDATE;

  IF subscription_uuid IS NULL THEN
    INSERT INTO public.subscriptions(manager_id, status, family_quota)
    VALUES(manager_uuid, 'active', paid_count)
    RETURNING id INTO subscription_uuid;
  ELSE
    -- Update the family quota
    UPDATE public.subscriptions
    SET family_quota = paid_count, status = 'active',
        cancel_at_period_end = false, cancelled_at = NULL, updated_at = now()
    WHERE id = subscription_uuid;
  END IF;

  -- Calculate period dates
  SELECT max(ends_at) INTO old_ends_at
  FROM public.subscription_periods
  WHERE subscription_id = subscription_uuid AND status = 'active';

  start_at := now();
  end_at := greatest(now(), coalesce(old_ends_at, now())) + interval '30 days';

  -- Supersede old active periods (for renewal/upgrade/downgrade)
  UPDATE public.subscription_periods
  SET status = 'superseded'
  WHERE subscription_id = subscription_uuid AND status = 'active'
    AND req_payment_type IN ('renewal','upgrade','downgrade');

  -- Create new period
  INSERT INTO public.subscription_periods(subscription_id, starts_at, ends_at, status, source_payment_request_id)
  VALUES(subscription_uuid, start_at, end_at, 'active', p_request_id)
  RETURNING id INTO period_uuid;

  -- Update manager profile (maintaining backward compatibility)
  PERFORM set_config('healix.internal_action','true',true);
  UPDATE public.profiles
  SET subscription_status = 'active', subscription_end_date = end_at, updated_at = now()
  WHERE id = manager_uuid;

  -- Handle family memberships based on payment type
  IF req_payment_type = 'downgrade' THEN
    -- Selected members are included, all others are explicitly excluded (family_removed)
    INSERT INTO public.family_subscription_memberships(
      manager_id, member_id, subscription_period_id, status, included_from, included_until
    )
    SELECT manager_uuid, child.id, period_uuid,
           CASE WHEN child.id = ANY(selected_ids) THEN 'included' ELSE 'excluded' END,
           start_at, end_at
    FROM public.profiles child WHERE child.manager_id = manager_uuid;

    -- Update child profiles
    UPDATE public.profiles child
    SET subscription_status = CASE WHEN child.id = ANY(selected_ids) THEN 'active' ELSE 'expired' END,
        subscription_end_date = CASE WHEN child.id = ANY(selected_ids) THEN end_at ELSE now() END,
        updated_at = now()
    WHERE child.manager_id = manager_uuid;

  ELSIF req_payment_type = 'upgrade' THEN
    -- All existing members included, new slots available for future additions
    INSERT INTO public.family_subscription_memberships(
      manager_id, member_id, subscription_period_id, status, included_from, included_until
    )
    SELECT manager_uuid, child.id, period_uuid, 'included', start_at, end_at
    FROM public.profiles child WHERE child.manager_id = manager_uuid;

    UPDATE public.profiles child
    SET subscription_status = 'active', subscription_end_date = end_at, updated_at = now()
    WHERE child.manager_id = manager_uuid;

  ELSE
    -- new or renewal: selected members included, non-selected excluded
    INSERT INTO public.family_subscription_memberships(
      manager_id, member_id, subscription_period_id, status, included_from, included_until
    )
    SELECT manager_uuid, child.id, period_uuid,
           CASE WHEN child.id = ANY(selected_ids) THEN 'included' ELSE 'excluded' END,
           start_at, end_at
    FROM public.profiles child WHERE child.manager_id = manager_uuid;

    UPDATE public.profiles child
    SET subscription_status = CASE WHEN child.id = ANY(selected_ids) THEN 'active' ELSE 'expired' END,
        subscription_end_date = CASE WHEN child.id = ANY(selected_ids) THEN end_at ELSE now() END,
        updated_at = now()
    WHERE child.manager_id = manager_uuid;
  END IF;

  -- Update payment request status
  UPDATE public.payment_requests
  SET status = 'approved',
      reviewed_by = public.current_account_profile_id(),
      reviewed_at = now(),
      admin_confirmed_amount = coalesce(p_confirmed_amount, declared_transferred_amount, expected_amount),
      admin_notes = p_admin_notes,
      approved_subscription_id = subscription_uuid
  WHERE id = p_request_id
  RETURNING * INTO request_row;

  -- Send approval notification
  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES(
    manager_uuid,
    'تم تفعيل الاشتراك',
    CASE req_payment_type
      WHEN 'renewal' THEN 'تم تجديد اشتراكك بنجاح.'
      WHEN 'upgrade' THEN 'تم ترقية باقتك بنجاح. يمكنك الآن إضافة أفراد جدد.'
      WHEN 'downgrade' THEN 'تم تعديل باقتك بنجاح.'
      ELSE 'تمت مراجعة دفعتك وتفعيل اشتراكك بنجاح.'
    END,
    'general',
    '/subscriptions'
  );

  RETURN request_row;
END;
$$;

-- =========================================================================
-- 9. Replace create_sub_member() to read from subscriptions.family_quota
-- =========================================================================
DROP FUNCTION IF EXISTS public.create_sub_member(text, text, date, text, numeric, numeric);
CREATE OR REPLACE FUNCTION public.create_sub_member(
  member_name text,
  member_gender text,
  member_birth date,
  member_relation text,
  member_height numeric,
  member_weight numeric
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  manager_uuid uuid := public.current_account_profile_id();
  member_uuid uuid := gen_random_uuid();
  current_period uuid;
  included_count integer;
  quota integer;
BEGIN
  IF manager_uuid IS NULL THEN
    RAISE EXCEPTION 'Authenticated manager profile is required';
  END IF;

  -- Find current active period
  SELECT sp.id INTO current_period
  FROM public.subscriptions s
  JOIN public.subscription_periods sp ON sp.subscription_id = s.id
  WHERE s.manager_id = manager_uuid
    AND s.status IN ('active','cancelled_at_period_end')
    AND sp.status = 'active'
    AND sp.ends_at > now()
  ORDER BY sp.ends_at DESC LIMIT 1;

  IF current_period IS NULL THEN
    RAISE EXCEPTION 'An active subscription is required';
  END IF;

  -- Get quota from subscriptions table (first-class column)
  SELECT s.family_quota INTO quota
  FROM public.subscriptions s
  WHERE s.manager_id = manager_uuid
    AND s.status IN ('active','cancelled_at_period_end')
  LIMIT 1;

  -- Count currently included members
  SELECT count(*) INTO included_count
  FROM public.family_subscription_memberships
  WHERE subscription_period_id = current_period AND status = 'included';

  IF included_count >= coalesce(quota, 0) THEN
    RAISE EXCEPTION 'Family member quota has been reached';
  END IF;

  -- Validate input
  IF length(trim(coalesce(member_name,''))) < 2
     OR member_gender NOT IN ('male','female')
     OR member_relation NOT IN ('son','daughter','husband','wife','brother','sister')
     OR member_height NOT BETWEEN 30 AND 250
     OR member_weight NOT BETWEEN 2 AND 400
     OR member_birth > current_date
     OR member_birth < current_date - interval '120 years' THEN
    RAISE EXCEPTION 'Invalid family member details';
  END IF;

  -- Create profile
  PERFORM set_config('healix.internal_action','true',true);
  INSERT INTO public.profiles(
    id, full_name, gender, birth_date, height, weight,
    manager_id, role, subscription_status, subscription_end_date,
    is_onboarded, relation
  )
  SELECT member_uuid, trim(member_name), member_gender, member_birth,
         member_height, member_weight, manager_uuid, 'client', 'active',
         sp.ends_at, false, member_relation
  FROM public.subscription_periods sp WHERE sp.id = current_period;

  -- Create membership record
  INSERT INTO public.family_subscription_memberships(
    manager_id, member_id, subscription_period_id, status, included_from, included_until
  )
  SELECT manager_uuid, member_uuid, current_period, 'included', starts_at, ends_at
  FROM public.subscription_periods WHERE id = current_period;

  RETURN member_uuid;
END;
$$;

-- =========================================================================
-- 10. Add helper RPC to get subscription price from backend
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_subscription_price(sub_count integer)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT public.subscription_price(sub_count);
$$;

-- =========================================================================
-- 11. Add helper RPC to get current subscription details
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_my_subscription_details()
RETURNS TABLE(
  subscription_id uuid,
  status text,
  family_quota integer,
  period_starts_at timestamptz,
  period_ends_at timestamptz,
  access_state text,
  included_member_count integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.id,
    s.status,
    s.family_quota,
    sp.starts_at,
    sp.ends_at,
    public.profile_subscription_state(public.current_account_profile_id()),
    (SELECT count(*)::int FROM public.family_subscription_memberships fm
     WHERE fm.subscription_period_id = sp.id AND fm.status = 'included')
  FROM public.subscriptions s
  LEFT JOIN public.subscription_periods sp ON sp.subscription_id = s.id
    AND sp.status = 'active'
  WHERE s.manager_id = public.current_account_profile_id()
    AND s.status IN ('active','cancelled_at_period_end','cancelled','expired')
  ORDER BY sp.ends_at DESC NULLS LAST
  LIMIT 1;
$$;

-- =========================================================================
-- 12. Add secure admin RPC to update a client's subscription details manual bypass
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_update_client_subscription(
  p_client_id uuid,
  p_new_end_date timestamptz,
  p_new_status text,
  p_new_quota integer DEFAULT 0
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  subscription_uuid uuid;
  period_uuid uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin permission is required';
  END IF;

  -- 1. Update the profile with internal action session config set to bypass the trigger
  PERFORM set_config('healix.internal_action', 'true', true);
  
  UPDATE public.profiles
  SET subscription_status = p_new_status,
      subscription_end_date = p_new_end_date,
      is_locked = (p_new_status = 'expired'),
      updated_at = now()
  WHERE id = p_client_id;

  -- 2. Find or create a subscription for this manager
  SELECT id INTO subscription_uuid
  FROM public.subscriptions
  WHERE manager_id = p_client_id AND status IN ('active','cancelled_at_period_end','cancelled','expired')
  LIMIT 1;

  IF subscription_uuid IS NULL THEN
    INSERT INTO public.subscriptions(manager_id, status, family_quota)
    VALUES(p_client_id, CASE WHEN p_new_status = 'active' THEN 'active' ELSE 'expired' END, coalesce(p_new_quota, 0))
    RETURNING id INTO subscription_uuid;
  ELSE
    UPDATE public.subscriptions
    SET status = CASE WHEN p_new_status = 'active' THEN 'active' ELSE 'expired' END,
        family_quota = coalesce(p_new_quota, family_quota),
        updated_at = now()
    WHERE id = subscription_uuid;
  END IF;

  -- 3. Create or update period
  SELECT id INTO period_uuid
  FROM public.subscription_periods
  WHERE subscription_id = subscription_uuid AND status = 'active'
  ORDER BY ends_at DESC LIMIT 1;

  IF period_uuid IS NOT NULL THEN
    UPDATE public.subscription_periods
    SET ends_at = p_new_end_date,
        status = CASE WHEN p_new_status = 'active' THEN 'active'::text ELSE 'expired'::text END
    WHERE id = period_uuid;
  ELSE
    INSERT INTO public.subscription_periods(subscription_id, starts_at, ends_at, status)
    VALUES(subscription_uuid, now(), p_new_end_date, CASE WHEN p_new_status = 'active' THEN 'active' ELSE 'expired' END);
  END IF;
  
  -- 4. Sync family memberships
  UPDATE public.family_subscription_memberships
  SET status = CASE WHEN p_new_status = 'active' THEN 'included'::text ELSE 'expired'::text END,
      included_until = p_new_end_date
  WHERE manager_id = p_client_id;

  -- Sync sub profiles
  UPDATE public.profiles
  SET subscription_status = p_new_status,
      subscription_end_date = p_new_end_date,
      is_locked = (p_new_status = 'expired'),
      updated_at = now()
  WHERE manager_id = p_client_id;
END;
$$;

