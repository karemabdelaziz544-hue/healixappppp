import { useState, useEffect, useRef } from 'react';
import { Keyboard, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../../components/AppToast';
import * as Haptics from 'expo-haptics';
import type { Attachment } from './useChatAttachments';
import { OfflineQueue, generateUUID } from '../../../lib/offlineQueue';
import NetInfo from '@react-native-community/netinfo';

export function useChatComposer(
  inquiryId: string, 
  currentUserId: string | undefined, 
  receiverId: string | null, 
  attachment: Attachment | null, 
  setAttachment: (att: Attachment | null) => void,
  setMessages: React.Dispatch<React.SetStateAction<import('../../../types').Message[]>>
) {
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [lastSentAt, setLastSentAt] = useState(0);

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const MAX_MESSAGE_LENGTH = 1000;

  // 🔴 C4-FIX: Cleanup on unmount — release microphone lock and stop timer
  // if user navigates away mid-recording. Without this, the mic stays locked.
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const kShow = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const kHide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { kShow.remove(); kHide.remove(); };
  }, []);

  const startRecording = async () => {
    try {
      // 🔴 C4-FIX: Check existing permission before requesting.
      // Requesting immediately with no rationale risks App Store/Play Store rejection.
      const { status: existingStatus } = await Audio.getPermissionsAsync();

      if (existingStatus === 'denied') {
        showToast.error('تم رفض صلاحية الميكروفون. يرجى تفعيلها من إعدادات الجهاز.');
        return;
      }

      if (existingStatus !== 'granted') {
        const { status: newStatus } = await Audio.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          showToast.error('لا يمكن تسجيل صوتي بدون صلاحية الميكروفون');
          return;
        }
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      recordingRef.current = recording;
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      showToast.error('حدث خطأ أثناء تفعيل التسجيل');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingDuration(0);
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) setAttachment({ uri, name: 'voice-message.m4a', mimeType: 'audio/m4a' });
  };

  const sendMessage = async () => {
    const now = Date.now();
    if (now - lastSentAt < 1000) return;
    setLastSentAt(now);

    if (!receiverId || (!newMessage.trim() && !attachment) || !currentUserId) return;
    
    if (newMessage.trim().length > MAX_MESSAGE_LENGTH) {
      showToast.error('الرسالة طويلة جداً (الحد الأقصى 1000 حرف)');
      return;
    }

    setUploading(true);
    let attachmentPath = null;
    let attachmentType = null;
    let attachmentPayload = null;

    try {
      const state = await NetInfo.fetch();
      const isOnline = state.isConnected;

      if (attachment) {
        attachmentType = attachment.mimeType.startsWith('image/')
          ? 'image'
          : attachment.mimeType.startsWith('audio/')
            ? 'audio'
            : 'file';

        if (isOnline) {
          const fileExt = attachment.name.split('.').pop() || 'file';
          const filePath = `${currentUserId}/${Date.now()}.${fileExt}`;
          const fileResponse = await fetch(attachment.uri);
          const arrayBuffer = await fileResponse.arrayBuffer();

          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, arrayBuffer, {
              contentType: attachment.mimeType || 'application/octet-stream',
            });
          if (uploadError) throw uploadError;
          attachmentPath = filePath;
        } else {
          attachmentPayload = {
            uri: attachment.uri,
            name: attachment.name,
            mimeType: attachment.mimeType
          };
        }
      }

      const contentText = attachmentType === 'audio'
        ? '🎤 رسالة صوتية'
        : (newMessage || (attachmentType === 'image' ? '📷 صورة مرفقة' : '📎 ملف مرفق'));

      const messageId = generateUUID();
      const optimisticMsg: import('../../../types').Message = {
        id: messageId,
        sender_id: currentUserId!,
        receiver_id: receiverId!,
        content: contentText,
        attachment_url: attachmentPath,
        attachment_type: (attachmentType || null) as import('../../../types').Message['attachment_type'],
        recipient_type: inquiryId === 'support' ? 'admin' : 'doctor',
        inquiry_id: inquiryId === 'support' ? undefined : inquiryId,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [optimisticMsg, ...prev]);

      await OfflineQueue.addMutation('chat_send', currentUserId, {
        messageId,
        receiverId,
        content: contentText,
        attachmentUrl: attachmentPath,
        attachmentType,
        attachment: attachmentPayload,
        recipientType: inquiryId === 'support' ? 'admin' : 'doctor',
        inquiryId: inquiryId === 'support' ? undefined : inquiryId
      });

      setNewMessage('');
      setAttachment(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      showToast.error('فشل الإرسال، حاول مرة أخرى');
    } finally {
      setUploading(false);
    }
  };

  return { 
    newMessage, 
    setNewMessage, 
    uploading, 
    recording, 
    isKeyboardVisible, 
    recordingDuration, 
    startRecording, 
    stopRecording, 
    sendMessage 
  };
}
