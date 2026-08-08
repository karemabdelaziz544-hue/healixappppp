import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { executeQuery } from './apiClient';
import { logger } from './logger';
import NetInfo from '@react-native-community/netinfo';

const OFFLINE_QUEUE_KEY = 'healix_offline_queue';

export interface OfflineMutation {
  id: string;
  type: 'task_toggle' | 'chat_send' | 'health_log' | 'health_undo';
  userId: string;
  payload: any;
  timestamp: number;
  retryCount?: number;
}

const MAX_OFFLINE_RETRIES = 5;

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
  async addMutation(type: 'task_toggle' | 'chat_send' | 'health_log' | 'health_undo', userId: string, payload: any): Promise<void> {
    try {
      const queue = await this.getQueue();
      const newMutation: OfflineMutation = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type,
        userId,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.log('[OfflineQueue] No authenticated session found. Skipping sync.');
        return;
      }

      const queue = await this.getQueue();
      if (queue.length === 0) return;

      logger.log(`[OfflineQueue] Synchronizing ${queue.length} offline mutations...`);
      const remaining: OfflineMutation[] = [];

      // Fetch all profile IDs managed by or owned by the current authenticated account
      const currentUserId = session.user.id;
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('id')
        .or(`id.eq.${currentUserId},manager_id.eq.${currentUserId}`);

      const allowedProfileIds = new Set<string>(
        (userProfiles || []).map(p => p.id)
      );
      allowedProfileIds.add(currentUserId);

      for (const mutation of queue) {
        // Cross-Profile Authorization Check (FINDING-003)
        if (!allowedProfileIds.has(mutation.userId)) {
          logger.error(
            `[OfflineQueue] SECURITY ALERT: Dropping queued mutation ${mutation.id} because mutation.userId (${mutation.userId}) does not belong to active account (${currentUserId}) or managed sub-profiles.`
          );
          continue; // Drop/quarantine mutation safely without adding to remaining
        }

        const retries = (mutation.retryCount || 0) + 1;
        mutation.retryCount = retries;

        try {
          const success = await this.processMutation(mutation);
          if (!success) {
            if (retries >= MAX_OFFLINE_RETRIES) {
              logger.error(`[OfflineQueue] Dropping mutation ${mutation.id} after exceeding max retries (${MAX_OFFLINE_RETRIES})`);
            } else {
              remaining.push(mutation);
            }
          }
        } catch (err) {
          logger.error(`[OfflineQueue] Error processing mutation ${mutation.id} (attempt ${retries}):`, err);
          if (retries < MAX_OFFLINE_RETRIES) {
            remaining.push(mutation);
          } else {
            logger.error(`[OfflineQueue] Dropping failing mutation ${mutation.id} after ${retries} attempts.`);
          }
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

      // Validate taskId is a valid UUID before sending to PostgreSQL
      const isValidUuid = typeof taskId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
      if (!isValidUuid) {
        logger.warn(`[OfflineQueue] Dropping invalid task_toggle mutation with non-UUID taskId: "${taskId}"`);
        return true; // Return true to purge invalid item from queue
      }

      // Use raw Supabase call — bypasses executeQuery's 15s timeout which causes
      // false failures on slow Expo Go / debug connections.
      const { error } = await supabase.from('daily_task_logs').upsert(
        {
          user_id: mutation.userId,
          task_id: taskId,
          log_date: logDate,
          is_completed: isCompleted,
        },
        { onConflict: 'user_id,task_id,log_date' }
      );
      if (error) {
        logger.error('[OfflineQueue] task_toggle upsert failed:', JSON.stringify(error));
        // Drop invalid UUID format errors (22P02) from the persistent queue
        if (error.code === '22P02') {
          logger.warn(`[OfflineQueue] Purging mutation with invalid UUID syntax from queue: ${taskId}`);
          return true;
        }
        return false;
      }
      return true;
    }

    if (mutation.type === 'chat_send') {
      const { messageId, receiverId, content, attachment, recipientType, inquiryId } = mutation.payload;
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

      const validReceiverId = (receiverId && receiverId !== '00000000-0000-0000-0000-000000000000') ? receiverId : null;

      const { error } = await executeQuery(
        supabase.from('messages').insert({
          id: messageId,
          sender_id: mutation.userId,
          receiver_id: validReceiverId,
          content: content,
          attachment_url: attachmentPath,
          attachment_type: attachmentType,
          recipient_type: recipientType,
          inquiry_id: inquiryId || null,
          is_read: false,
          created_at: new Date(mutation.timestamp).toISOString()
        }),
        { retries: 2, isIdempotent: false }
      );
      if (error) {
        if ((error as any).code === '23505' || (error as any).message?.includes('duplicate key')) {
          logger.log(`[OfflineQueue] Message ${messageId} already exists in DB, marking sync complete.`);
          return true;
        }
        logger.error('[OfflineQueue] chat message insert error:', error);
        return false;
      }
      return true;
    }

    if (mutation.type === 'health_log') {
      const { metric, value, recordedAt } = mutation.payload;
      if (metric === 'water') {
        const { error } = await supabase.from('water_tracking').insert({
          user_id: mutation.userId,
          amount: Number(value),
          recorded_at: recordedAt
        });
        if (error) {
          logger.error('[OfflineQueue] water log failed:', JSON.stringify(error));
          return false;
        }
      } else if (metric === 'sleep') {
        const { error } = await supabase.from('lifestyle_profile').upsert({
          user_id: mutation.userId,
          sleep_hours: Number(value.hours),
          sleep_quality: value.quality
        }, { onConflict: 'user_id' });
        if (error) {
          logger.error('[OfflineQueue] sleep log failed:', JSON.stringify(error));
          return false;
        }
      } else if (metric === 'weight') {
        const { error } = await supabase.from('inbody_records').insert({
          user_id: mutation.userId,
          weight: Number(value),
          record_date: recordedAt
        });
        if (error) {
          logger.error('[OfflineQueue] weight log failed:', JSON.stringify(error));
          return false;
        }
      }
      return true;
    }

    if (mutation.type === 'health_undo') {
      const { metric } = mutation.payload;
      if (metric === 'water') {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const { data, error: fetchErr } = await supabase
          .from('water_tracking')
          .select('id')
          .eq('user_id', mutation.userId)
          .gte('recorded_at', today.toISOString())
          .order('recorded_at', { ascending: false })
          .limit(1);

        if (fetchErr) {
          logger.error('[OfflineQueue] water undo fetch failed:', JSON.stringify(fetchErr));
          return false;
        }

        if (data && data.length > 0) {
          const { error: deleteErr } = await supabase
            .from('water_tracking')
            .delete()
            .eq('id', data[0].id);

          if (deleteErr) {
            logger.error('[OfflineQueue] water undo delete failed:', JSON.stringify(deleteErr));
            return false;
          }
        }
      }
      return true;
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
