-- All state transitions in the billing lifecycle are owned here. Clients can
-- request payment, but cannot choose a price or activate an entitlement.

CREATE OR REPLACE FUNCTION public.subscription_price(sub_count integer)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF sub_count < 0 OR sub_count > 20 THEN RAISE EXCEPTION 'Invalid family member count'; END IF;
  RETURN 500 + (sub_count * 150);
END;
$$;

CREATE OR REPLACE FUNCTION public.profile_subscription_state(profile_uuid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_admin() THEN 'admin'
    WHEN p.manager_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.family_subscription_memberships fm
      JOIN public.subscription_periods sp ON sp.id = fm.subscription_period_id
      WHERE fm.member_id = p.id AND fm.status = 'included' AND sp.status = 'active' AND sp.ends_at > now()
    ) THEN 'sub_inherited_active'
    WHEN p.manager_id IS NOT NULL THEN 'sub_excluded'
    WHEN EXISTS (SELECT 1 FROM public.payment_requests pr WHERE pr.user_id = p.id AND pr.status = 'pending') THEN 'payment_pending'
    WHEN EXISTS (SELECT 1 FROM public.payment_requests pr WHERE pr.user_id = p.id AND pr.status = 'rejected' ORDER BY pr.created_at DESC LIMIT 1) THEN 'payment_rejected'
    WHEN EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.manager_id = p.id AND s.status = 'cancelled') THEN 'cancelled'
    WHEN EXISTS (SELECT 1 FROM public.subscription_periods sp JOIN public.subscriptions s ON s.id = sp.subscription_id WHERE s.manager_id = p.id AND sp.status = 'active' AND sp.ends_at > now()) THEN 'active'
    WHEN EXISTS (SELECT 1 FROM public.subscription_periods sp JOIN public.subscriptions s ON s.id = sp.subscription_id WHERE s.manager_id = p.id) THEN 'expired'
    ELSE 'no_subscription'
  END
  FROM public.profiles p WHERE p.id = profile_uuid;
$$;

CREATE OR REPLACE VIEW public.subscription_entitlements WITH (security_invoker = true) AS
SELECT p.id AS profile_id, p.manager_id, public.profile_subscription_state(p.id) AS access_state,
       (SELECT max(sp.ends_at) FROM public.subscription_periods sp JOIN public.subscriptions s ON s.id = sp.subscription_id WHERE s.manager_id = coalesce(p.manager_id,p.id) AND sp.status = 'active') AS ends_at
FROM public.profiles p;

CREATE OR REPLACE FUNCTION public.create_payment_request(
  p_receipt_path text,
  p_sub_count integer,
  p_keep_member_ids uuid[] DEFAULT '{}',
  p_declared_transferred_amount numeric DEFAULT NULL,
  p_previous_request_id uuid DEFAULT NULL
)
RETURNS public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE manager_uuid uuid := public.current_account_profile_id(); expected numeric; request_row public.payment_requests; attempt_uuid uuid;
BEGIN
  IF manager_uuid IS NULL OR NOT public.owns_profile(manager_uuid) THEN RAISE EXCEPTION 'Only the authenticated account owner can submit a payment request'; END IF;
  IF p_receipt_path IS NULL OR p_receipt_path !~ ('^receipts/' || manager_uuid::text || '/[0-9a-f-]+\\.(jpg|jpeg|png|heic|pdf)$') THEN RAISE EXCEPTION 'Invalid receipt path'; END IF;
  expected := public.subscription_price(p_sub_count);
  IF p_declared_transferred_amount IS NOT NULL AND p_declared_transferred_amount <= 0 THEN RAISE EXCEPTION 'Invalid declared amount'; END IF;
  IF EXISTS (SELECT 1 FROM public.payment_requests WHERE user_id = manager_uuid AND status = 'pending') THEN RAISE EXCEPTION 'A payment request is already pending'; END IF;
  IF p_previous_request_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.payment_requests WHERE id = p_previous_request_id AND user_id = manager_uuid AND status = 'rejected') THEN RAISE EXCEPTION 'Invalid retry request'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_keep_member_ids) member_id WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = member_id AND manager_id = manager_uuid)) THEN RAISE EXCEPTION 'A selected family member is invalid'; END IF;
  IF cardinality(p_keep_member_ids) > p_sub_count THEN RAISE EXCEPTION 'Selected members exceed requested quota'; END IF;
  SELECT coalesce(attempt_group_id, id) INTO attempt_uuid FROM public.payment_requests WHERE id = p_previous_request_id;
  INSERT INTO public.payment_requests(user_id, amount, expected_amount, declared_transferred_amount, plan_type, status, receipt_url, renewal_metadata, previous_request_id, attempt_group_id, invoice_number)
  VALUES (manager_uuid, expected, expected, p_declared_transferred_amount, 'helix_integrated', 'pending', p_receipt_path,
          jsonb_build_object('sub_count',p_sub_count,'keep_member_ids',to_jsonb(p_keep_member_ids),'action_type',CASE WHEN p_sub_count = 0 THEN 'base' ELSE 'family' END),
          p_previous_request_id, coalesce(attempt_uuid, gen_random_uuid()), 'REQ-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text,1,8)))
  RETURNING * INTO request_row;
  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_payment_request(p_request_id uuid, p_confirmed_amount numeric DEFAULT NULL, p_admin_notes text DEFAULT NULL)
RETURNS public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE request_row public.payment_requests; subscription_uuid uuid; period_uuid uuid; manager_uuid uuid; start_at timestamptz; end_at timestamptz; paid_count integer; selected_ids uuid[];
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission is required'; END IF;
  SELECT * INTO request_row FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment request not found'; END IF;
  IF request_row.status <> 'pending' THEN RAISE EXCEPTION 'Only pending payment requests can be approved'; END IF;
  manager_uuid := request_row.user_id;
  paid_count := coalesce((request_row.renewal_metadata->>'sub_count')::int,0);
  selected_ids := coalesce(ARRAY(SELECT jsonb_array_elements_text(coalesce(request_row.renewal_metadata->'keep_member_ids','[]'::jsonb))::uuid), '{}');
  IF cardinality(selected_ids) > paid_count THEN RAISE EXCEPTION 'Payment request quota is invalid'; END IF;
  SELECT id INTO subscription_uuid FROM public.subscriptions WHERE manager_id = manager_uuid AND status IN ('active','cancelled_at_period_end') FOR UPDATE;
  IF subscription_uuid IS NULL THEN INSERT INTO public.subscriptions(manager_id,status) VALUES(manager_uuid,'active') RETURNING id INTO subscription_uuid; END IF;
  SELECT greatest(now(), coalesce(max(ends_at), now())) INTO start_at FROM public.subscription_periods WHERE subscription_id = subscription_uuid AND status = 'active';
  end_at := start_at + interval '30 days';
  INSERT INTO public.subscription_periods(subscription_id,starts_at,ends_at,status,source_payment_request_id) VALUES(subscription_uuid,start_at,end_at,'active',p_request_id) RETURNING id INTO period_uuid;
  PERFORM set_config('healix.internal_action','true',true);
  UPDATE public.profiles SET subscription_status = 'active', subscription_end_date = end_at, updated_at = now() WHERE id = manager_uuid;
  -- Every current child receives an explicit record. Selected members are
  -- included, while non-selected members are explicitly excluded.
  INSERT INTO public.family_subscription_memberships(manager_id,member_id,subscription_period_id,status,included_from,included_until)
  SELECT manager_uuid, child.id, period_uuid,
         CASE WHEN child.id = ANY(selected_ids) THEN 'included' ELSE 'excluded' END,
         start_at, end_at FROM public.profiles child WHERE child.manager_id = manager_uuid;
  UPDATE public.profiles child SET subscription_status = CASE WHEN child.id = ANY(selected_ids) THEN 'active' ELSE 'expired' END,
    subscription_end_date = CASE WHEN child.id = ANY(selected_ids) THEN end_at ELSE now() END, updated_at = now() WHERE child.manager_id = manager_uuid;
  UPDATE public.payment_requests SET status = 'approved', reviewed_by = public.current_account_profile_id(), reviewed_at = now(),
    admin_confirmed_amount = coalesce(p_confirmed_amount, declared_transferred_amount, expected_amount), admin_notes = p_admin_notes, approved_subscription_id = subscription_uuid
    WHERE id = p_request_id RETURNING * INTO request_row;
  INSERT INTO public.notifications(user_id,title,message,type,link) VALUES(manager_uuid,'تم تفعيل الاشتراك','تمت مراجعة دفعتك وتفعيل اشتراكك بنجاح.','general','/subscriptions');
  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_payment_request(p_request_id uuid, p_reason text, p_admin_notes text DEFAULT NULL)
RETURNS public.payment_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE request_row public.payment_requests;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission is required'; END IF;
  IF length(trim(coalesce(p_reason,''))) < 3 THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;
  SELECT * INTO request_row FROM public.payment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR request_row.status <> 'pending' THEN RAISE EXCEPTION 'Only pending payment requests can be rejected'; END IF;
  UPDATE public.payment_requests SET status='rejected', rejection_reason=trim(p_reason), admin_notes=p_admin_notes, reviewed_by=public.current_account_profile_id(), reviewed_at=now() WHERE id=p_request_id RETURNING * INTO request_row;
  INSERT INTO public.notifications(user_id,title,message,type,link) VALUES(request_row.user_id,'تم رفض طلب الدفع',trim(p_reason),'alert','/subscriptions');
  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_subscription_at_period_end()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE manager_uuid uuid := public.current_account_profile_id();
BEGIN
  IF manager_uuid IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  UPDATE public.subscriptions SET status='cancelled_at_period_end', cancel_at_period_end=true, cancelled_at=now(), updated_at=now()
    WHERE manager_id=manager_uuid AND status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'No active subscription found'; END IF;
END;
$$;
