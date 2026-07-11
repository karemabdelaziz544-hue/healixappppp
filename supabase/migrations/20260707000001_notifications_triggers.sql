-- =========================================================================
-- Supabase Migration: 20260707000001_notifications_triggers.sql
-- Description: Sets up automatic notifications via database triggers for:
--   1. New Messages (chat/support)
--   2. New Health Plans
--   3. New/Updated Inquiries
-- Also registers the notifications table for Supabase Realtime broadcast.
-- =========================================================================

-- Clean up existing triggers and trigger functions to allow re-runs
DROP TRIGGER IF EXISTS on_new_message_created ON public.messages;
DROP FUNCTION IF EXISTS public.handle_new_message_notification();

DROP TRIGGER IF EXISTS on_new_plan_created ON public.plans;
DROP FUNCTION IF EXISTS public.handle_new_plan_notification();

DROP TRIGGER IF EXISTS on_inquiry_changes ON public.inquiries;
DROP FUNCTION IF EXISTS public.handle_inquiry_updates_notification();

-- ─── 1. MESSAGE NOTIFICATION TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  sender_role TEXT;
  receiver_role TEXT;
  notif_title TEXT;
  notif_link TEXT;
BEGIN
  -- Get sender info
  SELECT full_name, role INTO sender_name, sender_role FROM public.profiles WHERE id = NEW.sender_id;
  -- Get receiver info
  SELECT role INTO receiver_role FROM public.profiles WHERE id = NEW.receiver_id;

  IF NEW.receiver_id IS NOT NULL AND NEW.receiver_id != NEW.sender_id THEN
    -- Differentiate between inquiry chat and direct support chat
    IF NEW.inquiry_id IS NOT NULL THEN
      notif_title := 'رسالة استفسار جديدة 💬';
      IF receiver_role IN ('admin', 'doctor') THEN
        notif_link := '/doctor/chat'; -- For doctor/admin web panel
      ELSE
        notif_link := '/inquiry/' || NEW.inquiry_id; -- For client mobile app
      END IF;
    ELSE
      -- Support chat
      IF receiver_role = 'admin' THEN
        notif_title := 'رسالة جديدة من عميل 💬';
        notif_link := '/admin/chat';
      ELSE
        notif_title := 'رسالة جديدة من الدعم الفني 💬';
        notif_link := '/support';
      END IF;
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.receiver_id,
      notif_title,
      COALESCE(sender_name, 'Healix') || ': ' || substring(NEW.content from 1 for 60),
      'chat',
      notif_link
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();


-- ─── 2. PLAN NOTIFICATION TRIGGER ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_plan_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.user_id,
    'تم إضافة خطة جديدة 📋',
    'قام الطبيب/الأدمن بإضافة نظام جديد لك: ' || NEW.title,
    'plan',
    '/plan-details'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_plan_created
  AFTER INSERT ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_plan_notification();


-- ─── 3. INQUIRY NOTIFICATION TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_inquiry_updates_notification()
RETURNS TRIGGER AS $$
DECLARE
  client_name TEXT;
  doc_id UUID;
  admin_rec RECORD;
BEGIN
  -- INSERT: New Inquiry created by client
  IF TG_OP = 'INSERT' THEN
    SELECT full_name, assigned_doctor_id INTO client_name, doc_id FROM public.profiles WHERE id = NEW.user_id;
    
    -- If there's an assigned doctor, notify them
    IF doc_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        doc_id,
        'استفسار جديد من عميل 💬',
        'قام العميل ' || COALESCE(client_name, 'مستند') || ' بتوجيه استفسار جديد: ' || NEW.title,
        'chat',
        '/doctor/chat'
      );
    ELSE
      -- Notify all admins
      FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          admin_rec.id,
          'استفسار غير معين ⚠️',
          'استفسار جديد غير معين من ' || COALESCE(client_name, 'مستند') || ': ' || NEW.title,
          'chat',
          '/admin/chat'
        );
      END LOOP;
    END IF;
  
  -- UPDATE: Inquiry status changed (e.g. closed, under_review, replied)
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'تحديث حالة الاستفسار 🔄',
      'تم تحديث حالة استفسارك "' || NEW.title || '" إلى: ' || 
      CASE NEW.status 
        WHEN 'open' THEN 'مفتوح'
        WHEN 'under_review' THEN 'قيد المراجعة'
        WHEN 'replied' THEN 'تم الرد'
        WHEN 'closed' THEN 'مغلق'
        ELSE NEW.status
      END,
      'alert',
      '/inquiry/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_inquiry_changes
  AFTER INSERT OR UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.handle_inquiry_updates_notification();


-- ─── 4. ENABLE REALTIME FOR NOTIFICATIONS TABLE ─────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
