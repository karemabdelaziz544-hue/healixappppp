-- =========================================================================
-- Migration: 20260707000002_daily_task_logs_fix.sql
-- Description:
--   1. Enable Realtime on daily_task_logs
--   2. Add RLS policies for doctors and admins to view their clients' logs
-- =========================================================================

-- ─── 1. Enable Realtime ──────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'daily_task_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_task_logs;
  END IF;
END $$;

-- ─── 2. Doctor/Admin can view their clients' daily task logs ─────────────
DROP POLICY IF EXISTS "Doctors and admins can view client daily logs" ON public.daily_task_logs;
CREATE POLICY "Doctors and admins can view client daily logs" ON public.daily_task_logs
  FOR SELECT USING (
    public.check_user_is_admin(auth.uid())
    OR auth.uid() IN (
      SELECT assigned_doctor_id FROM public.profiles WHERE id = daily_task_logs.user_id
    )
  );
