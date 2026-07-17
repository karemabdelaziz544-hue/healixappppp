/**
 * formatMessage utils for Healix AI Chat
 */

export const formatMessageTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // Arabic RTL localized time layout (e.g., 14:30)
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
};

export const sanitizeMessageInput = (text: string): string => {
  return text ? text.trim() : '';
};
