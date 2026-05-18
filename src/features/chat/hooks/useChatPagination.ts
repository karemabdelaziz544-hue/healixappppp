import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Message } from '../../../types';

export function useChatPagination(channelType: string, currentUserId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const openChat = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const role = channelType === 'doctor' ? 'doctor' : 'admin';
      let receiverData = null;

      if (channelType === 'doctor') {
        const { data: userProfile } = await supabase.from('profiles').select('assigned_coach_id').eq('id', currentUserId).single();
        if (userProfile?.assigned_coach_id) {
           const { data: coachData } = await supabase.from('profiles').select('id, updated_at').eq('id', userProfile.assigned_coach_id).single();
           receiverData = coachData;
        }
      }

      if (!receiverData) {
        const { data } = await supabase.from('profiles').select('id, updated_at').eq('role', role).limit(1).single();
        receiverData = data;
      }

      if (receiverData && currentUserId) {
        setReceiverId(receiverData.id);
        setLastSeen(receiverData.updated_at);
        const { data: messagesData } = await supabase
          .from('messages')
          .select('id, sender_id, receiver_id, content, attachment_url, attachment_type, recipient_type, is_read, created_at')
          .eq('recipient_type', role)
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverData.id}),and(sender_id.eq.${receiverData.id},receiver_id.eq.${currentUserId})`)
          .order('created_at', { ascending: false })
          .limit(30);
          
        if (messagesData) {
          setMessages(messagesData as Message[]);
          if (messagesData.length < 30) setHasMore(false);
        }

        await supabase.from('messages').update({ is_read: true }).eq('receiver_id', currentUserId).eq('sender_id', receiverData.id).eq('is_read', false);
      }
    } catch (err) {
      if (__DEV__) console.log(err);
    } finally {
      setLoading(false);
    }
  }, [channelType, currentUserId]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loadingMore || !receiverId || !currentUserId) return;
    setLoadingMore(true);
    try {
      const role = channelType === 'doctor' ? 'doctor' : 'admin';
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) return;

      const { data: olderMessages } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, attachment_url, attachment_type, recipient_type, is_read, created_at')
        .eq('recipient_type', role)
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`)
        .lt('created_at', lastMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(30);

      if (olderMessages && olderMessages.length > 0) {
        setMessages(prev => [...prev, ...(olderMessages as Message[])]);
        if (olderMessages.length < 30) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      if (__DEV__) console.log(err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, receiverId, currentUserId, channelType, messages]);

  return { messages, setMessages, receiverId, lastSeen, loading, loadingMore, hasMore, openChat, loadMoreMessages };
}
