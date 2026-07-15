-- Fix doctor medical profile access and secure receipts storage policies

-- 1. Update can_manage_medical_profile to grant doctor role access to patient profiles
CREATE OR REPLACE FUNCTION public.can_manage_medical_profile(profile_uuid uuid, write_access boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.owns_profile(profile_uuid) 
         OR public.is_admin() 
         -- Doctors can manage medical profiles
         OR EXISTS (
           SELECT 1 FROM public.profiles 
           WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'doctor'
         )
         OR EXISTS (
           SELECT 1 FROM public.profiles child
           LEFT JOIN public.family_medical_consents consent ON consent.member_id = child.id AND consent.manager_id = public.current_account_profile_id() AND consent.revoked_at IS NULL
           WHERE child.id = profile_uuid AND child.manager_id = public.current_account_profile_id()
             AND ((child.relation IN ('son','daughter') AND child.birth_date > current_date - interval '18 years')
                  OR (CASE WHEN write_access THEN coalesce(consent.can_update,false) ELSE coalesce(consent.can_view,false) END))
         );
$$;

-- 2. Drop existing receipts SELECT and INSERT policies
DROP POLICY IF EXISTS "receipt owner or admin may read" ON storage.objects;
DROP POLICY IF EXISTS "receipt uploads are server only" ON storage.objects;

-- 3. Create updated receipts SELECT policy allowing admins, subscription owners, and event booking owners
CREATE POLICY "receipt owner or admin may read" ON storage.objects FOR SELECT USING (
  bucket_id = 'receipts' AND (
    public.is_admin() 
    OR EXISTS (SELECT 1 FROM public.payment_requests pr WHERE pr.receipt_url = name AND public.owns_profile(pr.user_id))
    OR EXISTS (SELECT 1 FROM public.event_bookings eb WHERE eb.payment_proof = name AND public.owns_profile(eb.user_id))
  )
);

-- 4. Create updated receipts INSERT policy allowing users to upload their own event receipts
CREATE POLICY "receipt uploads allowed" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipts' AND (
    -- Allow client uploads to 'events/USER_ID/...'
    (split_part(name, '/', 1) = 'events' AND public.owns_profile((split_part(name, '/', 2))::uuid))
  )
);
