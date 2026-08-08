-- =====================================================================
-- Phase 1 — Critical Security (P0) Migration: Storage & RLS Hardening
-- Ensures strict medical document isolation, doctor authorization boundaries,
-- and eliminates loose wildcard storage policies.
-- =====================================================================

-- =====================================================
-- 1. Hardening RECEIPTS Bucket Policies (Eliminate Substring Leakage)
-- =====================================================
DROP POLICY IF EXISTS "receipt_select" ON storage.objects;
DROP POLICY IF EXISTS "receipt_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipt_update" ON storage.objects;
DROP POLICY IF EXISTS "receipt_delete" ON storage.objects;

CREATE POLICY "receipt_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'receipts' AND auth.role() = 'authenticated' AND (
    -- Admin can view all receipts
    public.is_admin()
    -- Doctor can view payment receipts if assigned or admin
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'doctor'
    )
    -- User views their own subscription receipts via payment_requests table match
    OR EXISTS (
      SELECT 1 FROM public.payment_requests pr
      WHERE pr.receipt_url = name AND public.owns_profile(pr.user_id)
    )
    -- User views event booking receipts via event_bookings table match
    OR EXISTS (
      SELECT 1 FROM public.event_bookings eb
      WHERE eb.payment_proof = name AND public.owns_profile(eb.user_id)
    )
    -- User views receipts in their exact folder prefix
    OR name LIKE 'events/' || auth.uid()::text || '/%'
    OR name LIKE 'renew_' || auth.uid()::text || '_%'
    OR name LIKE 'new_sub_' || auth.uid()::text || '_%'
    OR name LIKE 'modify_' || auth.uid()::text || '_%'
    OR name LIKE 'payment_' || auth.uid()::text || '_%'
    OR name LIKE 'receipts/' || auth.uid()::text || '/%'
  )
);

CREATE POLICY "receipt_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipts' AND auth.role() = 'authenticated' AND (
    (split_part(name, '/', 1) = 'events' AND split_part(name, '/', 2) = auth.uid()::text)
    OR (split_part(name, '/', 1) = 'receipts' AND split_part(name, '/', 2) = auth.uid()::text)
    OR name LIKE 'renew_' || auth.uid()::text || '_%'
    OR name LIKE 'new_sub_' || auth.uid()::text || '_%'
    OR name LIKE 'modify_' || auth.uid()::text || '_%'
    OR name LIKE 'payment_' || auth.uid()::text || '_%'
    OR public.is_admin()
  )
);

CREATE POLICY "receipt_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'receipts' AND auth.role() = 'authenticated' AND public.is_admin()
);

CREATE POLICY "receipt_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'receipts' AND auth.role() = 'authenticated' AND public.is_admin()
);

-- =====================================================
-- 2. Hardening CHAT-ATTACHMENTS Bucket (Assigned Doctor Boundary)
-- =====================================================
DROP POLICY IF EXISTS "chat_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;

CREATE POLICY "chat_attachments_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'chat-attachments' AND auth.role() = 'authenticated' AND (
    -- Owner of the folder
    split_part(name, '/', 1) = auth.uid()::text
    -- Admin prefix
    OR split_part(name, '/', 1) = 'admin_' || auth.uid()::text
    -- Admins can view all
    OR public.is_admin()
    -- Family manager can view managed children attachments
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id::text = split_part(name, '/', 1) AND manager_id = auth.uid()
    )
    -- Assigned doctor ONLY can access patient's attachments
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id::text = split_part(name, '/', 1)
        AND (assigned_doctor_id = auth.uid() OR assigned_doctor_id = public.current_account_profile_id())
    )
  )
);

CREATE POLICY "chat_attachments_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'chat-attachments' AND auth.role() = 'authenticated' AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR split_part(name, '/', 1) = 'admin_' || auth.uid()::text
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (auth_user_id = auth.uid() OR id = auth.uid()) AND role = 'doctor'
    )
  )
);

-- =====================================================
-- 3. Hardening MEDICAL-DOCS Bucket (Assigned Doctor / Consent Boundary)
-- =====================================================
DROP POLICY IF EXISTS "medical_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "medical_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "medical_docs_delete" ON storage.objects;

CREATE POLICY "medical_docs_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'medical-docs' AND auth.role() = 'authenticated' AND (
    -- Owner access by UUID prefix
    split_part(name, '/', 2) = auth.uid()::text
    -- Admin access
    OR public.is_admin()
    -- Managed family member access check
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = split_part(name, '/', 2)
        AND public.can_manage_medical_profile(p.id, false)
    )
    -- Assigned doctor ONLY can access patient medical docs
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = split_part(name, '/', 2)
        AND (p.assigned_doctor_id = auth.uid() OR p.assigned_doctor_id = public.current_account_profile_id())
    )
  )
);

CREATE POLICY "medical_docs_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'medical-docs' AND auth.role() = 'authenticated' AND (
    split_part(name, '/', 2) = auth.uid()::text
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = split_part(name, '/', 2)
        AND public.can_manage_medical_profile(p.id, true)
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = split_part(name, '/', 2)
        AND (p.assigned_doctor_id = auth.uid() OR p.assigned_doctor_id = public.current_account_profile_id())
    )
  )
);

CREATE POLICY "medical_docs_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'medical-docs' AND auth.role() = 'authenticated' AND (
    split_part(name, '/', 2) = auth.uid()::text
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id::text = split_part(name, '/', 2)
        AND (p.assigned_doctor_id = auth.uid() OR p.assigned_doctor_id = public.current_account_profile_id())
    )
  )
);
