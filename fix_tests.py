with open("supabase/tests/rls_tests.sql", "w") as f:
    f.write("""BEGIN;
SELECT plan(10);

-- MOCK DATA SETUP
-- Doctor A: 00000000-0000-0000-0000-000000000001
-- Patient A: 00000000-0000-0000-0000-000000000002
-- Patient B: 00000000-0000-0000-0000-000000000003
-- Manager A: 00000000-0000-0000-0000-000000000004
-- Patient C: 00000000-0000-0000-0000-000000000005

-- Test 1: Doctor -> Assigned Patient (Positive)
SET ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}';
SELECT lives_ok(
  $$ SELECT * FROM public.inquiries WHERE user_id = '00000000-0000-0000-0000-000000000002'; $$,
  'Doctor A can read assigned Patient A inquiries'
);

-- Test 2: Doctor -> Unassigned Patient (Negative)
SET ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}';
SELECT is_empty(
  $$ SELECT * FROM public.inquiries WHERE user_id = '00000000-0000-0000-0000-000000000003'; $$,
  'Doctor A CANNOT read unassigned Patient B inquiries'
);

-- Test 3: Manager -> Managed Child (Positive)
SET ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000004"}';
SELECT lives_ok(
  $$ SELECT * FROM public.inquiries WHERE user_id = '00000000-0000-0000-0000-000000000005'; $$,
  'Manager A can read child Patient C inquiries'
);

-- Test 4: Manager -> Unrelated Patient (Negative)
SET ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000004"}';
SELECT is_empty(
  $$ SELECT * FROM public.inquiries WHERE user_id = '00000000-0000-0000-0000-000000000003'; $$,
  'Manager A CANNOT read unrelated Patient B inquiries'
);

-- Test 5: Client -> Client Data (Negative)
SET ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000002"}';
SELECT is_empty(
  $$ SELECT * FROM public.health_profile WHERE user_id = '00000000-0000-0000-0000-000000000003'; $$,
  'Client A CANNOT read Client B health profile'
);

-- Test 6: Audit Log Forgery (Negative)
SET ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000002"}';
SELECT throws_ok(
  $$ INSERT INTO public.enterprise_audit_logs (action, entity_type) VALUES ('forged_action', 'table'); $$,
  'new row violates row-level security policy for table "enterprise_audit_logs"',
  'Client A CANNOT insert forged audit logs'
);

-- Test 7: RPC get_user_onboarding_status Security
SET ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"6a9288e2-45e3-4017-919e-e2e79603f982"}';
SELECT throws_ok(
  $$ SELECT * FROM public.get_user_onboarding_status('8c545367-1601-4475-8461-1cc2d600b536'); $$,
  'Cross-user access denied',
  'RPC get_user_onboarding_status denies access when target_uid does not belong to the caller or managed child'
);

-- Test 8: RPC get_chat_receiver Security
SET ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000002"}';
SELECT throws_ok(
  $$ SELECT * FROM public.get_chat_receiver('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000003'); $$,
  'Cross-user access denied',
  'RPC get_chat_receiver blocks querying if p_current_uid is forged'
);

-- Test 9: RPC claim_notification_jobs Authorization
SET ROLE authenticated;
SET request.jwt.claims TO '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000002"}';
SELECT throws_ok(
  $$ SELECT * FROM public.claim_notification_jobs(5); $$,
  'permission denied for function claim_notification_jobs',
  'RPC claim_notification_jobs cannot be executed by authenticated users'
);

-- Test 10: RPC claim_notification_jobs Authorization
SET ROLE authenticated;
SELECT throws_ok(
  $$ SELECT * FROM public.claim_notification_jobs(5); $$,
  'permission denied for function claim_notification_jobs',
  'claim_notification_jobs blocked for authenticated users'
);

SELECT * FROM finish();
ROLLBACK;
""")
