-- =====================================================================
-- Migration: 20260804100004_db_indexes.sql
-- Description: Targeted Additive Performance Indexes (No Over-Indexing)
-- =====================================================================

-- Messages indexes for cursor pagination & realtime lookups
CREATE INDEX IF NOT EXISTS idx_messages_sender_created ON public.messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_created ON public.messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_inquiry_created ON public.messages(inquiry_id, created_at DESC) WHERE inquiry_id IS NOT NULL;

-- Notifications index for fast user unread feed filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

-- Activity logs index for audit & performance analytics
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON public.activity_logs(user_id, created_at DESC);

-- Daily task logs index for compliance rate computations
CREATE INDEX IF NOT EXISTS idx_daily_task_logs_user_date ON public.daily_task_logs(user_id, log_date DESC);

-- Daily logs index for streak calculations
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, date DESC);

-- Client documents & InBody records indexes for medical feeds
CREATE INDEX IF NOT EXISTS idx_client_docs_user_created ON public.client_documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbody_records_user_date ON public.inbody_records(user_id, record_date DESC);

-- Active plan query index
CREATE INDEX IF NOT EXISTS idx_plans_user_status ON public.plans(user_id, status) WHERE status = 'active';
