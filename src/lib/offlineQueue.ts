import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { executeQuery } from './apiClient';
import { logger } from './logger';
import NetInfo from '@react-native-community/netinfo';

const OFFLINE_QUEUE_KEY = 'healix_offline_queue';

export interface OfflineMutation {
  id: string;
  type: 'task_toggle' | 'chat_send';
  userId: string;
  payload: any;
  timestamp: number;
}

export const OfflineQueue = {
  /**
   * Retrieves all queued offline mutations.
   */
  async getQueue(): Promise<OfflineMutation[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      logger.error('[OfflineQueue] Error getting queue:', e);
      return [];
    }
  },

  /**
   * Saves the current mutation queue to persistent storage.
   */
  async saveQueue(queue: OfflineMutation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      logger.error('[OfflineQueue] Error saving queue:', e);
    }
  },

  /**
   * Adds a new mutation to the offline queue and schedules a sync if online.
   */
  async addMutation(type: 'task_toggle' | 'chat_send', userId: string, payload: any): Promise<void> {
    try {
      const queue = await this.getQueue();
      const newMutation: OfflineMutation = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type,
        userId,
        payload,
        timestamp: Date.now(),
      };
      
      // Deduplicate task toggles for the same task/date to prevent double-processing redundant state changes
      let updatedQueue = queue;
      if (type === 'task_toggle') {
        updatedQueue = queue.filter(
          m => !(m.type === 'task_toggle' && 
                 m.payload.taskId === payload.taskId && 
                 m.payload.logDate === payload.logDate)
        );
      }
      
      updatedQueue.push(newMutation);
      await this.saveQueue(updatedQueue);
      logger.log(`[OfflineQueue] Mutation queued: ${newMutation.id}`);
      
      // Attempt immediate sync if connection is active
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        // Run in background
        this.sync().catch(err => logger.error('[OfflineQueue] background sync err:', err));
      }
    } catch (e) {
      logger.error('[OfflineQueue] Error adding mutation:', e);
    }
  },

  /**
   * Processes all queued mutations sequentially.
   */
  async sync(): Promise<void> {
    try {
      const queue = await this.getQueue();
      if (queue.length === 0) return;

      logger.log(`[OfflineQueue] Synchronizing ${queue.length} offline mutations...`);
      const remaining: OfflineMutation[] = [];

      for (const mutation of queue) {
        try {
          const success = await this.processMutation(mutation);
          if (!success) {
            remaining.push(mutation);
          }
        } catch (err) {
          logger.error(`[OfflineQueue] Error processing mutation ${mutation.id}:`, err);
          remaining.push(mutation);
        }
      }

      await this.saveQueue(remaining);
      logger.log(`[OfflineQueue] Synchronization complete. ${remaining.length} remaining.`);
    } catch (e) {
      logger.error('[OfflineQueue] Synchronization failed:', e);
    }
  },

  /**
   * Maps and executes the database operation for a single mutation.
   */
  async processMutation(mutation: OfflineMutation): Promise<boolean> {
    if (mutation.type === 'task_toggle') {
      const { taskId, isCompleted, logDate } = mutation.payload;
      const { error } = await executeQuery(
        supabase.from('daily_task_logs').upsert({
          user_id: mutation.userId,
          task_id: taskId,
          log_date: logDate,
          is_completed: isCompleted
        }, { onConflict: 'user_id,task_id,log_date' }),
        { retries: 2, isIdempotent: true }
      );
      return !error;
    }

    if (mutation.type === 'chat_send') {
      const { messageId, receiverId, content, attachment, recipientType } = mutation.payload;
      let attachmentPath = mutation.payload.attachmentUrl || null;
      let attachmentType = mutation.payload.attachmentType || null;

      // 📎 Upload local attachment if it hasn't been uploaded yet
      if (attachment && attachment.uri && !attachmentPath) {
        try {
          const fileExt = attachment.name.split('.').pop() || 'file';
          const filePath = `${mutation.userId}/${Date.now()}.${fileExt}`;
          
          const fileResponse = await fetch(attachment.uri);
          const arrayBuffer = await fileResponse.arrayBuffer();

          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, arrayBuffer, {
              contentType: attachment.mimeType || 'application/octet-stream',
            });
          
          if (uploadError) throw uploadError;

          attachmentPath = filePath;
          attachmentType = attachment.mimeType.startsWith('image/')
            ? 'image'
            : attachment.mimeType.startsWith('audio/')
              ? 'audio'
              : 'file';
        } catch (uploadErr) {
          logger.error(`[OfflineQueue] Attachment upload failed for msg ${messageId}:`, uploadErr);
          return false; // retry later when connection/file is stable
        }
      }

      const { error } = await executeQuery(
        supabase.from('messages').insert({
          id: messageId,
          sender_id: mutation.userId,
          receiver_id: receiverId,
          content: content,
          attachment_url: attachmentPath,
          attachment_type: attachmentType,
          recipient_type: recipientType,
          is_read: false,
          created_at: new Date(mutation.timestamp).toISOString()
        }),
        { retries: 2, isIdempotent: false }
      );
      return !error;
    }

    return true;
  }
};

/**
 * Generates a standard RFC4122 v4 UUID on the client.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
