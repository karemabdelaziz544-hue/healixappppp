-- =====================================================================
-- Migration: 20260804200000_fix_chat_and_inquiries_rls.sql
-- Description: Comprehensive Fix for Inquiries & Messages RLS Policies
-- Enables Clients, Assigned Doctors, Medical Professionals, and Support Admins
-- to SELECT and INSERT inquiries and messages seamlessly without dropping.
-- =====================================================================

-- 1. FIX RLS POLICIES ON public.inquiries
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and managers can access inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Authorized roles can access inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_select_policy" ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_insert_policy" ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_update_policy" ON public.inquiries;

-- SELECT: Client, Manager, Assigned Doctor, Any Doctor, Any Admin
CREATE POLICY "inquiries_select_policy" ON public.inquiries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = inquiries.user_id) OR
    auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = inquiries.user_id) OR
    public.check_user_is_medical_professional(auth.uid()) OR
    public.is_admin()
  );

-- INSERT: Client, Manager, Admin
CREATE POLICY "inquiries_insert_policy" ON public.inquiries
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = user_id) OR
    public.is_admin()
  );

-- UPDATE: Client, Assigned Doctor, Medical Professional, Admin
CREATE POLICY "inquiries_update_policy" ON public.inquiries
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR
    auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = inquiries.user_id) OR
    public.check_user_is_medical_professional(auth.uid()) OR
    public.is_admin()
  );


-- 2. FIX RLS POLICIES ON public.messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "Users can select their received or sent messages" ON public.messages;
DROP POLICY IF EXISTS "Users and admins can select messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their sent messages" ON public.messages;
DROP POLICY IF EXISTS "Users and admins can insert messages" ON public.messages;

-- SELECT: Allows reading messages if user is sender/receiver, or owns inquiry, or is assigned doctor/admin
CREATE POLICY "messages_select_policy" ON public.messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR
    receiver_id = auth.uid() OR
    recipient_type = 'admin' AND public.is_admin() OR
    recipient_type = 'doctor' AND public.check_user_is_medical_professional(auth.uid()) OR
    inquiry_id IN (
      SELECT id FROM public.inquiries WHERE
        user_id = auth.uid() OR
        auth.uid() IN (SELECT assigned_doctor_id FROM public.profiles WHERE id = inquiries.user_id) OR
        public.check_user_is_medical_professional(auth.uid()) OR
        public.is_admin()
    ) OR
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.owner_profile_id = auth.uid() OR
        c.visitor_token IS NOT NULL OR
        public.is_admin()
      )
    )
  );

-- INSERT: Allows inserting message if user is sender, or is customer/doctor/admin
CREATE POLICY "messages_insert_policy" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() OR
    public.is_admin() OR
    public.check_user_is_medical_professional(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.owner_profile_id = auth.uid() OR
        c.visitor_token IS NOT NULL OR
        public.is_admin()
      )
    )
  );
