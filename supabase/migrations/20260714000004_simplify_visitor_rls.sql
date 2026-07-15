-- Simplify RLS policies for conversations and messages to ensure anonymous visitors can read/write without complex subquery failures

-- 1. Re-create SELECT policy for conversations
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
CREATE POLICY "conversations_select_policy" ON public.conversations
  FOR SELECT USING (
    -- Anyone can view visitor conversations (needed for anonymous website widget)
    owner_type = 'visitor'
    -- Or regular customer owners
    OR owner_profile_id = auth.uid() 
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = conversations.owner_profile_id)
    -- Or admins
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Re-create UPDATE policy for conversations
DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;
CREATE POLICY "conversations_update_policy" ON public.conversations
  FOR UPDATE USING (
    owner_type = 'visitor'
    OR owner_profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Re-create SELECT policy for messages
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy" ON public.messages
  FOR SELECT USING (
    -- Anyone can view messages of visitor conversations
    EXISTS (
      SELECT 1 FROM public.conversations WHERE id = messages.conversation_id AND owner_type = 'visitor'
    )
    -- Or regular customer conversations
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.owner_profile_id = auth.uid()
        OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = c.owner_profile_id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
    -- Or fallback to old behavior for inquiries/direct messages if conversation_id is null
    OR sender_id = auth.uid()
    OR receiver_id = auth.uid()
  );

-- 4. Re-create INSERT policy for messages
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy" ON public.messages
  FOR INSERT WITH CHECK (
    -- Message belongs to an active visitor conversation
    EXISTS (
      SELECT 1 FROM public.conversations WHERE id = messages.conversation_id AND owner_type = 'visitor' AND status != 'closed'
    )
    -- Or message belongs to a customer conversation
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND (
        c.owner_profile_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
    -- Or fallback
    OR sender_id = auth.uid()
  );

-- 5. Ensure messages table has replica identity set to full for realtime filters to work properly on updates/deletes
ALTER TABLE public.messages REPLICA IDENTITY FULL;
