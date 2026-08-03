-- Migration: Add atomic SECURITY DEFINER function to delete authenticated user and all sub-accounts

CREATE OR REPLACE FUNCTION public.delete_own_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Clean up sub-account data and profiles managed by this user
  DELETE FROM public.family_subscription_memberships WHERE manager_id = current_user_id OR member_id = current_user_id;
  DELETE FROM public.family_medical_consents WHERE manager_id = current_user_id OR member_id = current_user_id;
  DELETE FROM public.subscriptions WHERE manager_id = current_user_id;
  DELETE FROM public.payment_requests WHERE user_id = current_user_id;
  DELETE FROM public.health_profile WHERE user_id = current_user_id;
  DELETE FROM public.lifestyle_profile WHERE user_id = current_user_id;
  DELETE FROM public.inbody_records WHERE user_id = current_user_id;
  DELETE FROM public.client_documents WHERE user_id = current_user_id;
  DELETE FROM public.daily_logs WHERE user_id = current_user_id;
  DELETE FROM public.daily_task_logs WHERE user_id = current_user_id;
  DELETE FROM public.activity_logs WHERE user_id = current_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = current_user_id;

  -- 2. Delete child member profiles
  DELETE FROM public.profiles WHERE manager_id = current_user_id;

  -- 3. Delete user's main profile
  DELETE FROM public.profiles WHERE id = current_user_id;

  -- 4. Clean up auth schema dependencies before deleting auth.users
  DELETE FROM auth.mfa_amr_claims WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = current_user_id);
  DELETE FROM auth.mfa_factors WHERE user_id = current_user_id;
  DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = current_user_id);
  DELETE FROM auth.sessions WHERE user_id = current_user_id;
  DELETE FROM auth.identities WHERE user_id = current_user_id;

  -- 5. Permanently delete user from auth.users so login is impossible
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_user_account() TO authenticated;
