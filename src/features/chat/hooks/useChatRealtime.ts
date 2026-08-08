import { useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';
import type { Message } from '../../../types';

// Helper: prepend a message only if it's not already in the list.
// Prevents double-render when two overlapping subscriptions deliver the same event.
function prependUnique(msg: Message): React.SetStateAction<Message[]> {
  return (prev) => {
    if (prev.some(m => m.id === msg.id)) return prev;
    return [msg, ...prev];
  };
}

export function useChatRealtime(
  inquiryId: string,
  currentUserId: string | undefined,
  receiverId: string | null,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!inquiryId || !currentUserId) return;
    const channelName = `chat_inquiry_${inquiryId}_${currentUserId}`;
    
    let channel: ReturnType<typeof supabase.channel>;
    if (inquiryId === 'support') {
      channel = supabase.channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, (payload) => {
          const msg = payload.new as Message;
          if (msg.recipient_type === 'admin') {
            logger.log('[useChatRealtime] Incoming support message:', msg.id);
            setMessages(prependUnique(msg));
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUserId}` }, (payload) => {
          const msg = payload.new as Message;
          if (msg.recipient_type === 'admin') {
            logger.log('[useChatRealtime] Outgoing support message confirmed:', msg.id);
            setMessages(prependUnique(msg));
          }
        }).subscribe((status) => {
          logger.log(`[useChatRealtime] Support channel status: ${status}`);
        });
    } else {
      channel = supabase.channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `inquiry_id=eq.${inquiryId}` }, (payload) => {
          const msg = payload.new as Message;
          logger.log('[useChatRealtime] Inquiry realtime message:', msg.id);
          setMessages(prependUnique(msg));
        }).subscribe((status) => {
          logger.log(`[useChatRealtime] Inquiry channel status: ${status}`);
        });
    }
    channelRef.current = channel;

    return () => { 
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [inquiryId, currentUserId, setMessages]);
}
