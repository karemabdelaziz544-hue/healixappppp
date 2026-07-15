-- Migration to separate device push tokens from the profile
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (auth_user_id, token)
);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own push tokens" ON public.device_push_tokens
  FOR ALL USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS device_push_tokens_active_profile_idx ON public.device_push_tokens(active_profile_id);

-- Clean up old fcm_token column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS fcm_token;
