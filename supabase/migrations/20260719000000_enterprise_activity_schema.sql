-- =========================================================================
-- Migration: 20260719000000_enterprise_activity_schema.sql
-- Description:
--   1. Create activity_logs table (with steps, distance, calories, goal snapshotting, and source constraints)
--   2. Create user_activity_goals table (stores current targets)
--   3. Enable RLS and bind SELECT/INSERT/UPDATE/DELETE policies for patients, managers, and doctors
-- =========================================================================

-- 1. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0 CHECK (steps >= 0),
  distance NUMERIC NOT NULL DEFAULT 0 CHECK (distance >= 0),
  active_minutes INTEGER NOT NULL DEFAULT 0 CHECK (active_minutes >= 0),
  calories NUMERIC NOT NULL DEFAULT 0 CHECK (calories >= 0),
  walking_minutes INTEGER NOT NULL DEFAULT 0 CHECK (walking_minutes >= 0),
  running_minutes INTEGER NOT NULL DEFAULT 0 CHECK (running_minutes >= 0),
  cycling_minutes INTEGER NOT NULL DEFAULT 0 CHECK (cycling_minutes >= 0),
  goal_steps INTEGER NOT NULL DEFAULT 10000 CHECK (goal_steps >= 0),
  goal_minutes INTEGER NOT NULL DEFAULT 30 CHECK (goal_minutes >= 0),
  source TEXT NOT NULL DEFAULT 'Pedometer' CHECK (source IN ('Pedometer', 'AppleHealth', 'GoogleFit', 'Garmin', 'Huawei', 'Manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 2. Create user_activity_goals table
CREATE TABLE IF NOT EXISTS public.user_activity_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  daily_steps INTEGER NOT NULL DEFAULT 10000 CHECK (daily_steps >= 0),
  daily_minutes INTEGER NOT NULL DEFAULT 30 CHECK (daily_minutes >= 0),
  daily_calories INTEGER NOT NULL DEFAULT 300 CHECK (daily_calories >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_goals ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Policies for activity_logs
DROP POLICY IF EXISTS "Users, managers, and doctors can access activity logs" ON public.activity_logs;
CREATE POLICY "Users, managers, and doctors can access activity logs" ON public.activity_logs
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = activity_logs.user_id) OR
    public.check_user_is_medical_professional(auth.uid())
  );

-- 5. Create Security Policies for user_activity_goals
DROP POLICY IF EXISTS "Users, managers, and doctors can access user activity goals" ON public.user_activity_goals;
CREATE POLICY "Users, managers, and doctors can access user activity goals" ON public.user_activity_goals
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = user_activity_goals.user_id) OR
    public.check_user_is_medical_professional(auth.uid())
  );

-- Add database performance indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON public.activity_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_activity_goals_user ON public.user_activity_goals(user_id);
