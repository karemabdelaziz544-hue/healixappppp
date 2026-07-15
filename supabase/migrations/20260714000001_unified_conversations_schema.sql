-- Unified Support Conversation Schema
-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('customer_support', 'website_visitor')),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('customer', 'visitor')),
  owner_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  visitor_token UUID,
  visitor_name TEXT,
  visitor_phone TEXT,
  visitor_email TEXT,
  visitor_subject TEXT,
  landing_page_url TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'assigned', 'in_progress', 'closed')),
  assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT owner_type_checks CHECK (
    (owner_type = 'customer' AND owner_profile_id IS NOT NULL AND visitor_token IS NULL) OR
    (owner_type = 'visitor' AND owner_profile_id IS NULL AND visitor_token IS NOT NULL)
  )
);

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 2. Modify messages table
-- Drop NOT NULL from sender_id and receiver_id
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN receiver_id DROP NOT NULL;

-- Add new columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_type TEXT NOT NULL DEFAULT 'customer' CHECK (sender_type IN ('customer', 'visitor', 'support_agent', 'system'));
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Data Migration: convert existing flat customer support messages to conversation-based
DO $$
DECLARE
  user_rec RECORD;
  conv_id UUID;
BEGIN
  -- Find all users who have support messages (where recipient_type = 'admin')
  FOR user_rec IN 
    SELECT DISTINCT u.id, p.full_name, p.phone
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE EXISTS (
      SELECT 1 FROM public.messages m 
      WHERE (m.sender_id = u.id OR m.receiver_id = u.id) 
        AND m.recipient_type = 'admin'
    )
  LOOP
    -- Create a conversation for this user if they don't already have one
    INSERT INTO public.conversations (
      conversation_type,
      owner_type,
      owner_profile_id,
      status,
      created_at,
      updated_at
    ) VALUES (
      'customer_support',
      'customer',
      user_rec.id,
      'in_progress',
      now(),
      now()
    )
    RETURNING id INTO conv_id;

    -- Update existing support messages to link to this conversation
    UPDATE public.messages
    SET 
      conversation_id = conv_id,
      sender_type = CASE 
        WHEN sender_id = user_rec.id THEN 'customer'::text
        ELSE 'support_agent'::text
      END,
      sender_profile_id = sender_id
    WHERE (sender_id = user_rec.id OR receiver_id = user_rec.id) 
      AND recipient_type = 'admin'
      AND conversation_id IS NULL;
  END LOOP;
END $$;

-- 4. Re-create RLS policies for conversations and messages to allow anonymous visitors
-- RLS Policies for conversations
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
CREATE POLICY "conversations_select_policy" ON public.conversations
  FOR SELECT USING (
    owner_profile_id = auth.uid() 
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = conversations.owner_profile_id)
    -- Allow admins to see everything
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    -- Allow visitors to select their own conversation by token
    OR visitor_token IS NOT NULL
  );

DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
CREATE POLICY "conversations_insert_policy" ON public.conversations
  FOR INSERT WITH CHECK (
    -- Registered customers can insert their own
    (owner_type = 'customer' AND owner_profile_id = auth.uid())
    -- Anonymous visitors can insert
    OR (owner_type = 'visitor' AND visitor_token IS NOT NULL)
  );

DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;
CREATE POLICY "conversations_update_policy" ON public.conversations
  FOR UPDATE USING (
    owner_profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (owner_type = 'visitor' AND visitor_token IS NOT NULL)
  );

-- RLS Policies for messages
DROP POLICY IF EXISTS "Users can select their received or sent messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their sent messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;

CREATE POLICY "messages_select_policy" ON public.messages
  FOR SELECT USING (
    -- Message belongs to a conversation the user has access to
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.owner_profile_id = auth.uid()
        OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = c.owner_profile_id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR c.visitor_token IS NOT NULL
      )
    )
    -- Or fallback to old behavior for inquiries/direct messages if conversation_id is null
    OR sender_id = auth.uid()
    OR receiver_id = auth.uid()
  );

CREATE POLICY "messages_insert_policy" ON public.messages
  FOR INSERT WITH CHECK (
    -- Message belongs to a conversation the user has access to
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.owner_profile_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        -- Allow anonymous visitor to send if status is not closed
        OR (c.visitor_token IS NOT NULL AND c.status != 'closed')
      )
    )
    -- Or fallback
    OR sender_id = auth.uid()
  );
