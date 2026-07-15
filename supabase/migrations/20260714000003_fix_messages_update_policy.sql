-- Fix messages UPDATE policy to allow admins to mark any message as read
-- The original policy only allowed receiver_id = auth.uid() which doesn't work
-- for visitor messages where receiver_id is null.

DROP POLICY IF EXISTS "Users can mark received messages as read" ON public.messages;

CREATE POLICY "Users can mark received messages as read" ON public.messages
  FOR UPDATE USING (
    receiver_id = auth.uid()
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = receiver_id)
    -- Allow admins to update any message (e.g. mark visitor messages as read)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    receiver_id = auth.uid()
    OR auth.uid() IN (SELECT manager_id FROM public.profiles WHERE id = receiver_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
