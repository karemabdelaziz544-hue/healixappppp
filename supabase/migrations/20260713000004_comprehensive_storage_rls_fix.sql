-- =====================================================================
-- Comprehensive fix for ALL storage bucket RLS policies
-- Ensures admin, doctor, and client can open/read/upload files correctly
-- =====================================================================

-- =====================================================
-- 1. RECEIPTS bucket — Fix SELECT + INSERT policies
-- =====================================================

-- Drop ALL existing receipts policies to avoid conflicts
DROP POLICY IF EXISTS "receipt owner or admin may read" ON storage.objects;
DROP POLICY IF EXISTS "receipt uploads allowed" ON storage.objects;
DROP POLICY IF EXISTS "receipt uploads are server only" ON storage.objects;
DROP POLICY IF EXISTS "Users and managers can access subscription receipts" ON storage.objects;

-- SELECT: Admin can see ALL receipts. Users can see their own receipts.
CREATE POLICY "receipt_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'receipts' AND auth.role() = 'authenticated' AND (
    -- Admin can view all receipts
    public.is_admin()
    -- Doctor can view all receipts (for event bookings, patient records etc.)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'doctor'
    )
    -- Owner can view their own subscription receipts (matched via payment_requests)
    OR EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.receipt_url = name AND public.owns_profile(pr.user_id)
    )
    -- Owner can view their own event booking receipts (matched via event_bookings)
    OR EXISTS (
      SELECT 1 FROM public.event_bookings eb
      WHERE eb.payment_proof = name AND public.owns_profile(eb.user_id)
    )
    -- Owner can view files in their own folder (events/USER_ID/...)
    OR name LIKE 'events/' || auth.uid()::text || '/%'
    -- Owner can view receipts named with their ID prefix patterns
    OR name LIKE '%' || auth.uid()::text || '%'
  )
);

-- INSERT: Authenticated users can upload their own receipts
CREATE POLICY "receipt_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipts' AND auth.role() = 'authenticated' AND (
    -- Allow event receipt uploads to events/USER_ID/...
    (split_part(name, '/', 1) = 'events' AND split_part(name, '/', 2) = auth.uid()::text)
    -- Allow subscription receipt uploads (renew_, new_sub_, modify_ patterns)
    OR name LIKE 'renew_' || auth.uid()::text || '_%'
    OR name LIKE 'new_sub_' || auth.uid()::text || '_%'
    OR name LIKE 'modify_' || auth.uid()::text || '_%'
    OR name LIKE 'payment_' || auth.uid()::text || '_%'
    -- Admin can upload any receipt
    OR public.is_admin()
  )
);

-- UPDATE: Admin only
CREATE POLICY "receipt_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'receipts' AND auth.role() = 'authenticated' AND public.is_admin()
);

-- DELETE: Admin only
CREATE POLICY "receipt_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'receipts' AND auth.role() = 'authenticated' AND public.is_admin()
);

-- =====================================================
-- 2. CHAT-ATTACHMENTS bucket — Fix SELECT + INSERT
-- =====================================================

-- Drop ALL existing chat-attachments policies
DROP POLICY IF EXISTS "Users and doctors can access storage chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users and managers can access chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;

-- SELECT: Admin/Doctor can see ALL. Users can see own + family.
CREATE POLICY "chat_attachments_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'chat-attachments' AND auth.role() = 'authenticated' AND (
    -- Owner of the folder
    name LIKE auth.uid()::text || '/%'
    -- Admin prefix (admin_UUID/...)
    OR name LIKE 'admin_' || auth.uid()::text || '/%'
    -- Admins can access ALL chat attachments
    OR public.is_admin()
    -- Doctors can access ALL chat attachments
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'doctor'
    )
    -- Family managers can access their children's attachments
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id::text = split_part(name, '/', 1) AND manager_id = auth.uid()
    )
    -- Assigned doctor can access patient's attachments
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id::text = split_part(name, '/', 1) AND assigned_doctor_id = auth.uid()
    )
  )
);

-- INSERT: Authenticated users can upload to their own folder, admin to admin_ folder
CREATE POLICY "chat_attachments_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'chat-attachments' AND auth.role() = 'authenticated' AND (
    -- Users upload to their own UUID folder
    name LIKE auth.uid()::text || '/%'
    -- Admin uploads to admin_UUID folder
    OR name LIKE 'admin_' || auth.uid()::text || '/%'
    -- Admins can upload anywhere
    OR public.is_admin()
    -- Doctors can upload to any chat
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'doctor'
    )
  )
);

-- UPDATE: Admin/Doctor can update
CREATE POLICY "chat_attachments_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'chat-attachments' AND auth.role() = 'authenticated' AND (
    name LIKE auth.uid()::text || '/%'
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'doctor'
    )
  )
);

-- DELETE: Admin only
CREATE POLICY "chat_attachments_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'chat-attachments' AND auth.role() = 'authenticated' AND (
    name LIKE auth.uid()::text || '/%'
    OR public.is_admin()
  )
);

-- =====================================================
-- 3. MEDICAL-DOCS bucket — Ensure doctor access
-- =====================================================

-- Drop all existing medical-docs policies
DROP POLICY IF EXISTS "medical docs authorized access" ON storage.objects;
DROP POLICY IF EXISTS "medical docs authorized upload" ON storage.objects;
DROP POLICY IF EXISTS "medical docs authorized delete" ON storage.objects;
DROP POLICY IF EXISTS "Authorized roles can access storage medical docs" ON storage.objects;
DROP POLICY IF EXISTS "Users and managers can access own medical docs" ON storage.objects;

-- SELECT: Admin/Doctor can see all. Users can see own + managed children.
CREATE POLICY "medical_docs_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'medical-docs' AND auth.role() = 'authenticated' AND (
    -- Owner: path contains their user ID
    name LIKE 'inbody/' || auth.uid()::text || '/%'
    OR name LIKE 'docs/' || auth.uid()::text || '/%'
    OR name LIKE '%/' || auth.uid()::text || '/%'
    -- Admin can access all
    OR public.is_admin()
    -- Doctor can access all (via can_manage_medical_profile or direct role check)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'doctor'
    )
    -- Family manager can see their children
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id::text = split_part(name, '/', 2) AND manager_id = auth.uid()
    )
  )
);

-- INSERT: Users upload to their own path
CREATE POLICY "medical_docs_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'medical-docs' AND auth.role() = 'authenticated' AND (
    name LIKE 'inbody/' || auth.uid()::text || '/%'
    OR name LIKE 'docs/' || auth.uid()::text || '/%'
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'doctor'
    )
    -- Family manager can upload for their children
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id::text = split_part(name, '/', 2) AND manager_id = auth.uid()
    )
  )
);

-- DELETE: Owner, admin, or doctor
CREATE POLICY "medical_docs_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'medical-docs' AND auth.role() = 'authenticated' AND (
    name LIKE 'inbody/' || auth.uid()::text || '/%'
    OR name LIKE 'docs/' || auth.uid()::text || '/%'
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'doctor'
    )
  )
);
