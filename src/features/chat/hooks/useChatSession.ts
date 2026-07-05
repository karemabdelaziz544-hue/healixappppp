import { useEffect } from 'react';
import { useChatPagination } from './useChatPagination';
import { useChatRealtime } from './useChatRealtime';
import { useChatAttachments } from './useChatAttachments';
import { useChatComposer } from './useChatComposer';

export type ChannelType = 'doctor' | 'admin';

export function useChatSession(inquiryId: string, currentUserId: string | undefined) {
  const pagination = useChatPagination(inquiryId, currentUserId);
  
  useChatRealtime(inquiryId, currentUserId, pagination.receiverId, pagination.setMessages);
  
  const attachments = useChatAttachments();
  
  const composer = useChatComposer(
    inquiryId, 
    currentUserId, 
    pagination.receiverId, 
    attachments.attachment, 
    attachments.setAttachment,
    pagination.setMessages
  );

  useEffect(() => {
    if (currentUserId) {
      pagination.openChat();
    }
  }, [currentUserId]); // Removed pagination.openChat from dependency to avoid infinite loops if it's not stable, though it's memoized

  return {
    ...pagination,
    ...attachments,
    ...composer,
  };
}
