import { useState, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { AIMessage, Conversation } from '../types';
import { healixAIService } from '../services/healixAIService';
import { showToast } from '@/components/AppToast';
import { useFamily } from '@/src/context/FamilyContext';
import { AppCache } from '@/src/lib/cache';

export const useHealixAI = () => {
  const { currentProfile } = useFamily();
  const profileId = currentProfile?.id;

  const [conversation, setConversation] = useState<Conversation>({
    id: `healix-ai-${profileId || 'default'}`,
    messages: [],
    createdAt: new Date().toISOString(),
  });
  
  const [loading, setLoading] = useState(false);

  // Load and switch profile-isolated chat history when active profile changes
  useEffect(() => {
    if (!profileId) return;

    let isMounted = true;
    const cacheKey = `healix_ai_chat_${profileId}`;

    AppCache.get<AIMessage[]>(cacheKey).then(cachedMessages => {
      if (isMounted) {
        setConversation({
          id: `healix-ai-${profileId}`,
          messages: cachedMessages || [],
          createdAt: new Date().toISOString(),
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !profileId) return;

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
    const updatedWithUser = [...conversation.messages, userMessage];
    setConversation(prev => ({
      ...prev,
      messages: updatedWithUser
    }));
    await AppCache.set(`healix_ai_chat_${profileId}`, updatedWithUser);

    setLoading(true);

    try {
      // Fetch latest messages to construct the API request
      const replyContent = await healixAIService.generateResponse(updatedWithUser, profileId);
      
      const assistantMessage: AIMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        type: 'text',
        content: replyContent,
        createdAt: new Date().toISOString(),
      };

      // Trigger success haptic on receiving reply
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const updatedWithAI = [...updatedWithUser, assistantMessage];
      setConversation(prev => ({
        ...prev,
        messages: updatedWithAI
      }));
      await AppCache.set(`healix_ai_chat_${profileId}`, updatedWithAI);
    } catch (error: any) {
      console.error('[useHealixAI] Error generating response:', error);
      // Trigger error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast.error(error.message || 'عذراً، فشل الاتصال بالمساعد الذكي.');
    } finally {
      setLoading(false);
    }
  }, [conversation.messages, loading, profileId]);

  return {
    conversation,
    loading,
    sendMessage,
    setMessages: useCallback((messages: AIMessage[]) => {
      setConversation(prev => ({ ...prev, messages }));
      if (profileId) {
        AppCache.set(`healix_ai_chat_${profileId}`, messages);
      }
    }, [profileId]),
  };
};
