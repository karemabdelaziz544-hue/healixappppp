-- Secure storage policies for medical-docs without relying on path parsing for access

DROP POLICY IF EXISTS "Authorized roles can access storage medical docs" ON storage.objects;
DROP POLICY IF EXISTS "Users and managers can access own medical docs" ON storage.objects;

-- SELECT: Authorize strictly via the client_documents table using file_url exact match
CREATE POLICY "medical docs authorized access" ON storage.objects FOR SELECT USING (
  bucket_id = 'medical-docs' AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.client_documents cd 
      WHERE cd.file_url = name 
      AND public.can_manage_medical_profile(cd.user_id, false)
    )
  )
);

-- INSERT: Enforce strict path structure "docs/USER_ID/..." and validate authorization
CREATE POLICY "medical docs authorized upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'medical-docs' AND 
  split_part(name, '/', 1) = 'docs' AND
  public.can_manage_medical_profile((split_part(name, '/', 2))::uuid, true)
);

-- DELETE: Only allowed if you can manage the profile OR if you are admin
CREATE POLICY "medical docs authorized delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'medical-docs' AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.client_documents cd 
      WHERE cd.file_url = name 
      AND public.can_manage_medical_profile(cd.user_id, true)
    )
  )
);
