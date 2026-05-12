-- ==========================================
-- 1. Create daily_task_logs table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.daily_task_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.plan_tasks(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure a user can only have one log entry per task per day
    UNIQUE(user_id, task_id, log_date)
);

-- ==========================================
-- 2. Add indexes for faster dashboard queries
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_daily_task_logs_user_date ON public.daily_task_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_daily_task_logs_task ON public.daily_task_logs(task_id);

-- ==========================================
-- 3. Enable Row Level Security (RLS)
-- ==========================================
ALTER TABLE public.daily_task_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. RLS Policies
-- ==========================================

-- A user can view their own logs
CREATE POLICY "Users can view their own daily task logs" 
ON public.daily_task_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- A user can insert their own logs
CREATE POLICY "Users can insert their own daily task logs" 
ON public.daily_task_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- A user can update their own logs
CREATE POLICY "Users can update their own daily task logs" 
ON public.daily_task_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- A manager can view their sub-accounts logs (Optional but good for future)
CREATE POLICY "Managers can view sub-account logs" 
ON public.daily_task_logs 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT manager_id FROM public.profiles WHERE id = daily_task_logs.user_id
  )
);
