-- Database Fix for Duplicate Client Conversations and Split Messages
-- 1. Merge messages from duplicate conversations into the newest conversation per client
DO $$
DECLARE
  dup RECORD;
  keep_conv_id UUID;
BEGIN
  FOR dup IN 
    SELECT owner_profile_id, COUNT(*)
    FROM public.conversations
    WHERE owner_type = 'customer' AND owner_profile_id IS NOT NULL
    GROUP BY owner_profile_id
    HAVING COUNT(*) > 1
  LOOP
    -- Find the newest conversation to keep
    SELECT id INTO keep_conv_id
    FROM public.conversations
    WHERE owner_profile_id = dup.owner_profile_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Update all messages belonging to any of this user's conversations to use the kept conversation ID
    UPDATE public.messages
    SET conversation_id = keep_conv_id
    WHERE conversation_id IN (
      SELECT id FROM public.conversations WHERE owner_profile_id = dup.owner_profile_id AND id != keep_conv_id
    );

    -- Delete the duplicate conversation rows (safe now as messages have been re-linked)
    DELETE FROM public.conversations
    WHERE owner_profile_id = dup.owner_profile_id AND id != keep_conv_id;
  END LOOP;
END $$;

-- 2. Link any stray/flat support messages for these users that have conversation_id = NULL
DO $$
DECLARE
  conv_rec RECORD;
BEGIN
  FOR conv_rec IN 
    SELECT id, owner_profile_id 
    FROM public.conversations 
    WHERE owner_type = 'customer' AND owner_profile_id IS NOT NULL
  LOOP
    UPDATE public.messages
    SET conversation_id = conv_rec.id
    WHERE conversation_id IS NULL
      AND (sender_id = conv_rec.owner_profile_id OR receiver_id = conv_rec.owner_profile_id)
      AND recipient_type = 'admin';
  END LOOP;
END $$;

-- 3. Create a unique constraint index to prevent duplicate conversations for the same customer
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_customer_idx 
ON public.conversations (owner_profile_id) 
WHERE owner_type = 'customer';
