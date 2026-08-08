-- =====================================================================
-- Migration: 20260804100002_notification_queue.sql
-- Description: Durable Notification Queue with Retry Backoff & DLQ
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'delivered', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS notification_queue_status_next_retry_idx ON public.notification_queue(status, next_retry_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS notification_queue_user_idx ON public.notification_queue(user_id, created_at DESC);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_queue_admin_read" ON public.notification_queue;
CREATE POLICY "notification_queue_admin_read" ON public.notification_queue
  FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- Dead Letter Queue (DLQ) View for Admin inspection
CREATE OR REPLACE VIEW public.notification_dead_letter_queue AS
SELECT * FROM public.notification_queue
WHERE status = 'failed' AND retry_count >= max_retries;
