-- =====================================================================
-- Migration: 20260804100001_ai_usage_detailed.sql
-- Description: Detailed Granular AI Usage, Token & Cost Tracking
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('dashboard_coach', 'chat_assistant', 'inbody_analysis')),
  model TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for AI usage analytics
CREATE INDEX IF NOT EXISTS ai_usage_user_idx ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_mode_created_idx ON public.ai_usage_logs(mode, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_correlation_idx ON public.ai_usage_logs(correlation_id) WHERE correlation_id IS NOT NULL;

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_admin_select" ON public.ai_usage_logs;
CREATE POLICY "ai_usage_admin_select" ON public.ai_usage_logs
  FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "ai_usage_insert" ON public.ai_usage_logs;
CREATE POLICY "ai_usage_insert" ON public.ai_usage_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
