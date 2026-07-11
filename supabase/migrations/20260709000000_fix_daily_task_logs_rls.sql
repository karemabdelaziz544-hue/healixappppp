-- Migration: 20260709000000_fix_daily_task_logs_rls.sql
-- Description: Recreate all key tables RLS policies using a SECURITY DEFINER function to bypass RLS on public.profiles table and fix sub-account query/update errors.

-- 1. Create a security definer function to check manager-client relationship (RLS Bypass)
CREATE OR REPLACE FUNCTION public.check_user_is_manager_of_client(manager_uuid UUID, client_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = client_uuid AND manager_id = manager_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. daily_task_logs table policies
DROP POLICY IF EXISTS "Users and managers can view daily task logs" ON public.daily_task_logs;
DROP POLICY IF EXISTS "Users and managers can insert daily task logs" ON public.daily_task_logs;
DROP POLICY IF EXISTS "Users and managers can update daily task logs" ON public.daily_task_logs;

CREATE POLICY "Users and managers can view daily task logs" ON public.daily_task_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );

CREATE POLICY "Users and managers can insert daily task logs" ON public.daily_task_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );

CREATE POLICY "Users and managers can update daily task logs" ON public.daily_task_logs
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );

-- 3. daily_logs table policies
DROP POLICY IF EXISTS "Users and managers can access daily logs" ON public.logs; -- cleanup potential duplicates
DROP POLICY IF EXISTS "Users and managers can access daily logs" ON public.daily_logs;

CREATE POLICY "Users and managers can access daily logs" ON public.daily_logs
  FOR ALL USING (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );

-- 4. plans table policies
DROP POLICY IF EXISTS "Users and managers can view plans" ON public.plans;
DROP POLICY IF EXISTS "Users and managers can modify plans" ON public.plans;

CREATE POLICY "Users and managers can view plans" ON public.plans
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );

CREATE POLICY "Users and managers can modify plans" ON public.plans
  FOR ALL USING (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );

-- 5. plan_tasks table policies
DROP POLICY IF EXISTS "Users and managers can view plan tasks" ON public.plan_tasks;
DROP POLICY IF EXISTS "Users and managers can update plan tasks" ON public.plan_tasks;

CREATE POLICY "Users and managers can view plan tasks" ON public.plan_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plans 
      WHERE plans.id = plan_tasks.plan_id AND (
        plans.user_id = auth.uid() OR 
        public.check_user_is_manager_of_client(auth.uid(), plans.user_id)
      )
    )
  );

CREATE POLICY "Users and managers can update plan tasks" ON public.plan_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.plans 
      WHERE plans.id = plan_tasks.plan_id AND (
        plans.user_id = auth.uid() OR 
        public.check_user_is_manager_of_client(auth.uid(), plans.user_id)
      )
    )
  );

-- 6. water_tracking table policies
DROP POLICY IF EXISTS "Users and managers can access water tracking" ON public.water_tracking;

CREATE POLICY "Users and managers can access water tracking" ON public.water_tracking
  FOR ALL USING (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );

-- 7. inbody_records table policies
DROP POLICY IF EXISTS "Users and managers can access inbody records" ON public.inbody_records;

CREATE POLICY "Users and managers can access inbody records" ON public.inbody_records
  FOR ALL USING (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );

-- 8. client_documents table policies
DROP POLICY IF EXISTS "Users and managers can access client documents" ON public.client_documents;

CREATE POLICY "Users and managers can access client documents" ON public.client_documents
  FOR ALL USING (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );

-- 9. health_profile table policies
DROP POLICY IF EXISTS "Users and managers can access health profile" ON public.health_profile;

CREATE POLICY "Users and managers can access health profile" ON public.health_profile
  FOR ALL USING (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );

-- 10. lifestyle_profile table policies
DROP POLICY IF EXISTS "Users and managers can access lifestyle profile" ON public.lifestyle_profile;

CREATE POLICY "Users and managers can access lifestyle profile" ON public.lifestyle_profile
  FOR ALL USING (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );

-- 11. inquiries table policies
DROP POLICY IF EXISTS "Users and managers can access inquiries" ON public.inquiries;

CREATE POLICY "Users and managers can access inquiries" ON public.inquiries
  FOR ALL USING (
    user_id = auth.uid() OR 
    public.check_user_is_manager_of_client(auth.uid(), user_id)
  );
