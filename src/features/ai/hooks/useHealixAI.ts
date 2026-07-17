import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { AIMessage, Conversation } from '../types';
import { healixAIService } from '../services/healixAIService';
import { showToast } from '@/components/AppToast';

export const useHealixAI = () => {
  const [conversation, setConversation] = useState<Conversation>({
    id: 'healix-ai-p1',
    messages: [],
    createdAt: new Date().toISOString(),
  });
  
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    // Trigger user impact haptic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      type: 'text',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    // Update conversation state with user message
    setConversation(prev => {
      const updatedMessages = [...prev.messages, userMessage];
      return {
        ...prev,
        messages: updatedMessages
      };
    });

    setLoading(true);

    try {
      // Fetch latest messages to construct the API request
      const currentMessages = [...conversation.messages, userMessage];
      
      const replyContent = await healixAIService.generateResponse(currentMessages);
      
      const assistantMessage: AIMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        type: 'text',
        content: replyContent,
        createdAt: new Date().toISOString(),
      };

      // Trigger success haptic on receiving reply
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setConversation(prev => {
        const updatedMessages = [...prev.messages, assistantMessage];
        return {
          ...prev,
          messages: updatedMessages
        };
      });
    } catch (error: any) {
      console.error('[useHealixAI] Error generating response:', error);
      // Trigger error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast.error(error.message || 'عذراً، فشل الاتصال بالمساعد الذكي.');
    } finally {
      setLoading(false);
    }
  }, [conversation.messages, loading]);

  return {
    conversation,
    loading,
    sendMessage,
    setMessages: useCallback((messages: AIMessage[]) => {
      setConversation(prev => ({ ...prev, messages }));
    }, []),
  };
};
