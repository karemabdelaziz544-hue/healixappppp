-- ============================================================
-- Fix: Sub-account onboarding completion RPC
-- Allows account managers to mark onboarding as complete for 
-- sub-accounts (or main accounts) securely via SECURITY DEFINER.
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_profile_onboarding(target_profile_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF target_profile_id IS NULL THEN
    RAISE EXCEPTION 'Target profile ID is required';
  END IF;

  -- Verify permissions: User must own the profile, manage the sub-account profile, or be an admin
  IF public.owns_profile(target_profile_id) OR public.manages_profile(target_profile_id) OR public.is_admin() THEN
    PERFORM set_config('healix.internal_action', 'true', true);
    
    UPDATE public.profiles
    SET is_onboarded = true
    WHERE id = target_profile_id;
    
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Permission denied to complete onboarding for profile %', target_profile_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_profile_onboarding(UUID) TO authenticated;
