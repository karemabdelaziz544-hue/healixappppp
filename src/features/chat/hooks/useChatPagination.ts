import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import { showToast } from '../../../../components/AppToast';
import { logger } from '../../../lib/logger';
import type { Message } from '../../../types';

export function useChatPagination(channelType: string, currentUserId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // 🔴 M1-FIX: stable ref for the last message cursor — prevents loadMoreMessages
  // from being invalidated on every realtime update that adds to messages[].
  const lastMessageRef = useRef<Message | null>(null);

  useEffect(() => {
    lastMessageRef.current = messages[messages.length - 1] ?? null;
  }, [messages]);

  const openChat = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const role = channelType === 'doctor' ? 'doctor' : 'admin';
      let targetReceiverId: string | null = null;
      let targetLastSeen: string | null = null;

      // 🌟 Phase 1: Optimize sequential latency by fetching coach/admin faster
      if (channelType === 'doctor') {
        const { data: userProfile, error: profileErr } = await executeQuery<{ assigned_coach_id: string }>(
          supabase.from('profiles').select('assigned_coach_id').eq('id', currentUserId).single()
        );
        
        if (!profileErr && userProfile?.assigned_coach_id) {
           const { data: coachData } = await executeQuery<{ id: string; updated_at: string }>(
             supabase.from('profiles').select('id, updated_at').eq('id', userProfile.assigned_coach_id).single()
           );
           if (coachData) {
             targetReceiverId = coachData.id;
             targetLastSeen = coachData.updated_at;
           }
        }
      }

      if (!targetReceiverId) {
        const { data: adminData, error: adminErr } = await executeQuery<{ id: string; updated_at: string }>(
          supabase.from('profiles').select('id, updated_at').eq('role', role).limit(1).single()
        );
        if (!adminErr && adminData) {
          targetReceiverId = adminData.id;
          targetLastSeen = adminData.updated_at;
        }
      }

      if (targetReceiverId && currentUserId) {
        setReceiverId(targetReceiverId);
        setLastSeen(targetLastSeen);
        
        const { data: messagesData, error: msgsErr } = await executeQuery<Message[]>(
          supabase
            .from('messages')
            .select('id, sender_id, receiver_id, content, attachment_url, attachment_type, recipient_type, is_read, created_at')
            .eq('recipient_type', role)
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetReceiverId}),and(sender_id.eq.${targetReceiverId},receiver_id.eq.${currentUserId})`)
            .order('created_at', { ascending: false })
            .limit(30)
        );
          
        if (msgsErr) throw msgsErr;

        if (messagesData) {
          setMessages(messagesData);
          if (messagesData.length < 30) setHasMore(false);
        }

        // Fire and forget read update (don't await to save time)
        executeQuery(
          supabase.from('messages').update({ is_read: true }).eq('receiver_id', currentUserId).eq('sender_id', targetReceiverId).eq('is_read', false)
        );
      }
    } catch (err: unknown) {
      logger.error('Failed to open chat:', err);
      showToast.error('فشل تحميل الرسائل، يرجى التحقق من اتصالك بالإنترنت');
    } finally {
      setLoading(false);
    }
  }, [channelType, currentUserId]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loadingMore || !receiverId || !currentUserId) return;
    setLoadingMore(true);
    try {
      const role = channelType === 'doctor' ? 'doctor' : 'admin';
      // 🔴 M1-FIX: read cursor from ref, not from closure — no stale data
      const lastMessage = lastMessageRef.current;
      if (!lastMessage) return;

      const { data: olderMessages, error } = await executeQuery<Message[]>(
        supabase
          .from('messages')
          .select('id, sender_id, receiver_id, content, attachment_url, attachment_type, recipient_type, is_read, created_at')
          .eq('recipient_type', role)
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`)
          .lt('created_at', lastMessage.created_at)
          .order('created_at', { ascending: false })
          .limit(30)
      );

      if (error) throw error;

      if (olderMessages && olderMessages.length > 0) {
        setMessages(prev => [...prev, ...olderMessages]);
        if (olderMessages.length < 30) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err: unknown) {
      logger.error('Failed to load older messages:', err);
      showToast.error('فشل تحميل الرسائل القديمة');
    } finally {
      setLoadingMore(false);
    }
  // messages removed from deps — cursor is read via lastMessageRef instead
  }, [hasMore, loadingMore, receiverId, currentUserId, channelType]);

  return { messages, setMessages, receiverId, lastSeen, loading, loadingMore, hasMore, openChat, loadMoreMessages };
}
