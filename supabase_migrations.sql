-- Migration: Doctor Assignment & Read Receipts RLS
-- Please run this SQL in your Supabase SQL Editor.

-- 1. Add assigned_coach_id to profiles (if it doesn't exist)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS assigned_coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Ensure RLS is enabled on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Policy for Read Receipts: Allow users to update is_read ONLY if they are the receiver
-- Note: Check if an update policy already exists before running this.
-- This ensures a user can only mark a message as read if they are the designated receiver.
CREATE POLICY "Allow users to update read status for their received messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Optional: If you want to explicitly restrict the update to ONLY the `is_read` column, 
-- Supabase/Postgres doesn't natively support column-level RLS UPDATE policies simply, 
-- but ensuring they are the receiver prevents malicious edits to other peoples' messages.

-- 4. Automatically create profile on user signup (Trigger)
-- This replaces client-side mutations in verify.tsx for security and data integrity.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, gender, subscription_status, is_onboarded, role, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'gender', ''),
    'new',
    false,
    'client',
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function on every insert into auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create Inquiries Table for Threaded Tickets System
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('nutrition', 'meals', 'weight', 'symptoms', 'exercises', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'replied', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Add inquiry_id to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE CASCADE;

-- 7. Ensure RLS is enabled on inquiries
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inquiries"
ON public.inquiries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inquiries"
ON public.inquiries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inquiries"
ON public.inquiries FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
