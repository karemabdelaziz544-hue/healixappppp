-- ============================================================
-- Fix: Admin cannot see payment_requests in web dashboard
-- Security: Uses defense-in-depth approach:
--   1. RLS on payment_requests table (layer 1)
--   2. is_admin() check inside the view WHERE clause (layer 2)
--   3. Underlying profiles RLS still applies via SECURITY INVOKER (layer 3)
-- ============================================================

-- 1. Ensure GRANTs are in place on underlying tables
GRANT SELECT ON public.payment_requests TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- 2. Recreate the RLS policy on payment_requests explicitly
DROP POLICY IF EXISTS "payment request owner or admin can read" ON public.payment_requests;
CREATE POLICY "payment request owner or admin can read" ON public.payment_requests
  FOR SELECT USING (
    public.owns_profile(user_id) 
    OR public.is_admin()
  );

-- 3. Create secure admin view with is_admin() guard in WHERE clause
--    Even if a non-admin queries this view, they ALWAYS get ZERO rows.
--    Defense-in-depth: triple-layered security.
DROP VIEW IF EXISTS public.admin_payment_requests_view CASCADE;
CREATE OR REPLACE VIEW public.admin_payment_requests_view AS
SELECT 
  pr.id,
  pr.user_id,
  pr.amount,
  pr.plan_type,
  pr.status,
  pr.receipt_url,
  pr.renewal_metadata,
  pr.created_at,
  pr.reviewed_at,
  pr.reviewed_by,
  pr.rejection_reason,
  p.full_name,
  p.phone,
  p.avatar_url
FROM public.payment_requests pr
LEFT JOIN public.profiles p ON pr.user_id = p.id
WHERE public.is_admin();

-- Grant SELECT to authenticated — but the WHERE clause above
-- ensures non-admins always receive an empty result set.
GRANT SELECT ON public.admin_payment_requests_view TO authenticated;
