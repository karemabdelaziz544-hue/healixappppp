import { useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Message } from '../../../types';

// Helper: prepend a message only if it's not already in the list.
// Prevents double-render when two overlapping subscriptions deliver the same event.
function prependUnique(msg: Message): React.SetStateAction<Message[]> {
  return (prev) => {
    if (prev.some(m => m.id === msg.id)) return prev; // 🔴 H3-FIX: deduplicate
    return [msg, ...prev];
  };
}

export function useChatRealtime(
  channelType: string,
  currentUserId: string | undefined,
  receiverId: string | null,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!channelType || !receiverId || !currentUserId) return;
    const channelName = `chat_${channelType}_${currentUserId}`;
    
    channelRef.current = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === receiverId) {
          setMessages(prependUnique(msg));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUserId}` }, (payload) => {
        const msg = payload.new as Message;
        if (msg.receiver_id === receiverId) {
          setMessages(prependUnique(msg));
        }
      }).subscribe();

    return () => { 
      if (channelRef.current) supabase.removeChannel(channelRef.current); 
    };
  }, [channelType, receiverId, currentUserId, setMessages]);
}

