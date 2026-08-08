import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import { showToast } from '../../../../components/AppToast';
import { logger } from '../../../lib/logger';
import type { Message } from '../../../types';

export function useChatPagination(inquiryId: string, currentUserId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastMessageRef = useRef<Message | null>(null);

  useEffect(() => {
    lastMessageRef.current = messages[messages.length - 1] ?? null;
  }, [messages]);

  const openChat = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      let targetReceiverId: string | null = null;
      let targetLastSeen: string | null = null;

      const { data: receiverData, error: rpcErr } = await executeQuery<{ receiver_id: string; last_seen: string }>(
        supabase.rpc('get_chat_receiver', { p_inquiry_id: inquiryId, p_current_uid: currentUserId })
      );

      if (!rpcErr && receiverData) {
        targetReceiverId = receiverData.receiver_id;
        targetLastSeen = receiverData.last_seen;
      }

      setReceiverId(targetReceiverId);
      setLastSeen(targetLastSeen);

      let query = supabase
          .from('messages')
          .select('id, sender_id, receiver_id, content, attachment_url, attachment_type, recipient_type, inquiry_id, is_read, created_at');

      if (inquiryId === 'support') {
          query = query.eq('recipient_type', 'admin').or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);
      } else {
          query = query.eq('inquiry_id', inquiryId);
      }

      const { data: messagesData, error: msgsErr } = await executeQuery<Message[]>(
          query.order('created_at', { ascending: false }).limit(30)
      );

      if (msgsErr) {
        logger.error('[useChatPagination] Error querying messages:', msgsErr);
        throw msgsErr;
      }

      if (messagesData) {
        setMessages(messagesData);
        if (messagesData.length < 30) setHasMore(false);
      }

      if (targetReceiverId) {
        executeQuery(
          supabase.from('messages').update({ is_read: true }).eq('receiver_id', currentUserId).eq('sender_id', targetReceiverId).eq('is_read', false)
        );
      }
    } catch (err: unknown) {
      logger.error('[useChatPagination] Failed to open chat:', err);
      showToast.error('فشل تحميل الرسائل، يرجى التحقق من اتصالك بالإنترنت');
    } finally {
      setLoading(false);
    }
  }, [inquiryId, currentUserId]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loadingMore || !currentUserId) return;
    setLoadingMore(true);
    try {
      const lastMessage = lastMessageRef.current;
      if (!lastMessage) return;

      let query = supabase
          .from('messages')
          .select('id, sender_id, receiver_id, content, attachment_url, attachment_type, recipient_type, inquiry_id, is_read, created_at')
          .lt('created_at', lastMessage.created_at);

      if (inquiryId === 'support') {
          query = query.eq('recipient_type', 'admin').or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);
      } else {
          query = query.eq('inquiry_id', inquiryId);
      }

      const { data: olderMessages, error } = await executeQuery<Message[]>(
        query.order('created_at', { ascending: false }).limit(30)
      );

      if (error) throw error;

      if (olderMessages && olderMessages.length > 0) {
        setMessages(prev => [...prev, ...olderMessages]);
        if (olderMessages.length < 30) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err: unknown) {
      logger.error('[useChatPagination] Failed to load older messages:', err);
      showToast.error('فشل تحميل الرسائل القديمة');
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, currentUserId, inquiryId]);

  return { messages, setMessages, receiverId, lastSeen, loading, loadingMore, hasMore, openChat, loadMoreMessages };
}
