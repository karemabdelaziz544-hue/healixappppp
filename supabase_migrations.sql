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
