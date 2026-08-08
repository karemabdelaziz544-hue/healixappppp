-- =====================================================================
-- Migration: 20260808120000_performance_indexes.sql
-- Description: Performance Indexes for Profiles & Payment Requests
-- =====================================================================

-- Index for sub-account & family manager profile lookups (RLS & profile switching)
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id 
  ON public.profiles(manager_id) 
  WHERE manager_id IS NOT NULL;

-- Index for user payment requests sorting & historical lookups
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_created 
  ON public.payment_requests(user_id, created_at DESC);

-- Index for admin payment review queue queries
CREATE INDEX IF NOT EXISTS idx_payment_requests_status_created 
  ON public.payment_requests(status, created_at DESC);
