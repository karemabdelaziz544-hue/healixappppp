import { executeQuery } from '@/src/lib/apiClient';
import { supabase } from '@/src/lib/supabase';
import { AIMessage } from '../types';

export const healixAIService = {
  generateResponse: async (messages: AIMessage[], profileId?: string): Promise<string> => {
    // Format last 10 messages for the Groq API structure (sliding memory window)
    const formattedMessages = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    const { data: fnData, error: fnError } = await executeQuery<{ choices?: { message?: { content?: string } }[] }>(
      supabase.functions.invoke('healix-ai', {
        body: { mode: 'chat_assistant', messages: formattedMessages, profileId },
      }),
      { timeoutMs: 25000, retries: 0 } // No retries for chats to avoid double submissions
    );

    if (fnError) throw fnError;
    
    const reply = fnData?.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error('فشل استرجاع الرد من المساعد الذكي');
    }
    
    return reply;
  }
};
