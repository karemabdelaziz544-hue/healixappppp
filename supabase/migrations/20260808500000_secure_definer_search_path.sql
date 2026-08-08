-- Fix SECURITY DEFINER vulnerabilities by setting explicit search_path
-- This prevents malicious search_path manipulation that could bypass security logic or execute arbitrary code.

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_new_message_notification() SET search_path = public;
ALTER FUNCTION public.handle_new_plan_notification() SET search_path = public;
ALTER FUNCTION public.handle_inquiry_updates_notification() SET search_path = public;
ALTER FUNCTION public.sync_daily_task_log_to_daily_logs() SET search_path = public;
ALTER FUNCTION public.check_user_is_manager_of_client(manager_uuid UUID, client_uuid UUID) SET search_path = public;
