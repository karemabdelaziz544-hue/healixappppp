import { useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Message } from '../../../types';

export function useChatRealtime(
  channelType: string,
  currentUserId: string | undefined,
  receiverId: string | null,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!channelType || !receiverId || !currentUserId) return;
    const channelName = `chat_${channelType}_${currentUserId}`;
    
    channelRef.current = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === receiverId) {
          setMessages(prev => [msg, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUserId}` }, (payload) => {
        const msg = payload.new as Message;
        if (msg.receiver_id === receiverId) {
          setMessages(prev => [msg, ...prev]);
        }
      }).subscribe();

    return () => { 
      if (channelRef.current) supabase.removeChannel(channelRef.current); 
    };
  }, [channelType, receiverId, currentUserId, setMessages]);
}
