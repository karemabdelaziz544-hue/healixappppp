-- =====================================================================
-- Migration: 20260804100003_feature_flags.sql
-- Description: Dynamic Feature Flags Schema with Percentage Rollout & Metadata
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  description TEXT,
  notes TEXT,
  expiration_date TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'user', 'role', 'subscription', 'environment')),
  scope_values JSONB DEFAULT '[]'::jsonb,
  rollout_percentage INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS feature_flags_key_idx ON public.feature_flags(flag_key);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_all_select" ON public.feature_flags;
CREATE POLICY "feature_flags_all_select" ON public.feature_flags
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "feature_flags_admin_all" ON public.feature_flags;
CREATE POLICY "feature_flags_admin_all" ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed standard enterprise feature flags
INSERT INTO public.feature_flags (flag_key, description, is_enabled, scope, rollout_percentage) VALUES
  ('ai_dashboard_coach', 'Enable Healix AI Daily Dashboard Coach', true, 'global', 100),
  ('inbody_ai_vision', 'Enable InBody Automated Vision Scanner', true, 'global', 100),
  ('family_sharing_v2', 'Enable Family Sub-account Consent System', true, 'global', 100),
  ('realtime_chat_v2', 'Enable High-Performance Realtime Chat Sync', true, 'global', 100),
  ('offline_sync_queue', 'Enable Persistent Offline Action Queue', true, 'global', 100)
ON CONFLICT (flag_key) DO NOTHING;
