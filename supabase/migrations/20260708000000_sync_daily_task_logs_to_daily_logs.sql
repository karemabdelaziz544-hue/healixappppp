-- =========================================================================
-- Migration: 20260708000000_sync_daily_task_logs_to_daily_logs.sql
-- Description:
--   1. Create trigger function to sync daily_task_logs to daily_logs completed_tasks array
--   2. Bind the trigger to the daily_task_logs table
-- =========================================================================

CREATE OR REPLACE FUNCTION public.sync_daily_task_log_to_daily_logs()
RETURNS TRIGGER AS $$
DECLARE
  current_tasks JSONB;
  updated_tasks JSONB;
BEGIN
  -- 1. Ensure a daily_logs row exists for the user and date
  INSERT INTO public.daily_logs (user_id, date, completed_tasks)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(NEW.log_date, OLD.log_date),
    '[]'::jsonb
  )
  ON CONFLICT (user_id, date) DO NOTHING;

  -- 2. Fetch the current completed_tasks array
  SELECT completed_tasks INTO current_tasks
  FROM public.daily_logs
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND date = COALESCE(NEW.log_date, OLD.log_date);

  IF current_tasks IS NULL THEN
    current_tasks := '[]'::jsonb;
  END IF;

  -- 3. If INSERT or UPDATE and is_completed is true
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.is_completed = true THEN
    -- Add task_id if not present
    IF NOT (current_tasks ? NEW.task_id::text) THEN
      updated_tasks := current_tasks || jsonb_build_array(NEW.task_id::text);
    ELSE
      updated_tasks := current_tasks;
    END IF;
  ELSE
    -- Remove task_id if present (or if TG_OP = 'DELETE' or is_completed = false)
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    INTO updated_tasks
    FROM jsonb_array_elements_text(current_tasks) AS elem
    WHERE elem != COALESCE(NEW.task_id, OLD.task_id)::text;
  END IF;

  -- 4. Update the daily_logs row
  UPDATE public.daily_logs
  SET completed_tasks = updated_tasks,
      updated_at = now()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND date = COALESCE(NEW.log_date, OLD.log_date);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger
DROP TRIGGER IF EXISTS trg_sync_daily_task_logs ON public.daily_task_logs;
CREATE TRIGGER trg_sync_daily_task_logs
AFTER INSERT OR UPDATE OR DELETE ON public.daily_task_logs
FOR EACH ROW
EXECUTE FUNCTION public.sync_daily_task_log_to_daily_logs();
