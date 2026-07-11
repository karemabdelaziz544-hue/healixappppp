-- =========================================================================
-- Migration: 20260708000002_add_plan_type_to_plans.sql
-- Description:
--   Add plan_type column to plans table (defaulting to 'nutrition')
-- =========================================================================

ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'nutrition';
