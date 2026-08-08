-- 1. Update prevent_client_profile_privilege_changes to allow admins to modify protected fields
CREATE OR REPLACE FUNCTION public.prevent_client_profile_privilege_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Allow updates if it's an internal server action OR the user is an admin
  IF current_setting('healix.internal_action', true) = 'true' OR public.is_admin() THEN 
    RETURN NEW; 
  END IF;
  
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

-- 2. Drop and Re-create admin_clients_view to include assigned_doctor_id
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
WHERE p.role = 'client';
