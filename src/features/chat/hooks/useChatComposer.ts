import { useState, useEffect, useRef } from 'react';
import { Alert, Keyboard, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../../components/AppToast';
import * as Haptics from 'expo-haptics';
import type { Attachment } from './useChatAttachments';

export function useChatComposer(
  channelType: string, 
  currentUserId: string | undefined, 
  receiverId: string | null, 
  attachment: Attachment | null, 
  setAttachment: (att: Attachment | null) => void
) {
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [lastSentAt, setLastSentAt] = useState(0);

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_MESSAGE_LENGTH = 1000;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const kShow = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const kHide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { kShow.remove(); kHide.remove(); };
  }, []);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      Alert.alert('خطأ', 'لا يمكن الوصول للميكروفون');
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

    try {
      if (attachment) {
        const fileExt = attachment.name.split('.').pop() || 'file';
        const filePath = `${currentUserId}/${Date.now()}.${fileExt}`;

        // 🌟 H-09: Safely upload using fetch arrayBuffer for cross-platform stability instead of FormData
        const fileResponse = await fetch(attachment.uri);
        const arrayBuffer = await fileResponse.arrayBuffer();

        const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, arrayBuffer, {
            contentType: attachment.mimeType || 'application/octet-stream',
        });
        
        if (uploadError) throw uploadError;

        attachmentPath = filePath;
        attachmentType = attachment.mimeType.startsWith('image/')
          ? 'image'
          : attachment.mimeType.startsWith('audio/')
            ? 'audio'
            : 'file';
      }

      const { error } = await supabase.from('messages').insert([{
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: attachmentType === 'audio'
          ? '🎤 رسالة صوتية'
          : (newMessage || (attachmentType === 'image' ? '📷 صورة مرفقة' : '📎 ملف مرفق')),
        attachment_url: attachmentPath,
        attachment_type: attachmentType,
        recipient_type: channelType,
        is_read: false,
      }]);

      if (error) throw error;
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
