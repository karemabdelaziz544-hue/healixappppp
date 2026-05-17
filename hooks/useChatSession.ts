import { useState, useEffect, useRef } from 'react';
import { Alert, Keyboard, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';
import { showToast } from '../components/AppToast';
import type { Message } from '../src/types';

export type ChannelType = 'doctor' | 'admin';

export interface Attachment {
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * useChatSession — Hook موحد لكل منطق الشات (الدكتور أو الدعم)
 * يغطي: الرسائل، الـ Realtime، الإرسال، المرفقات، التسجيل الصوتي
 */
export function useChatSession(channelType: ChannelType, currentUserId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const channelRef = useRef<any>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_MESSAGE_LENGTH = 1000;

  // ⌨️ Keyboard listeners
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const kShow = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const kHide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { kShow.remove(); kHide.remove(); };
  }, []);

  // 🚀 فتح الشات عند تعيين المستخدم
  useEffect(() => {
    if (currentUserId) {
      openChat();
    }
  }, [currentUserId]);

  // 📡 Realtime subscription — مع فلاتر أمنية على الخادم
  useEffect(() => {
    if (!channelType || !receiverId || !currentUserId) return;
    const channelName = `chat_${channelType}_${currentUserId}`;
    channelRef.current = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === receiverId) {
          setMessages(prev => [msg, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUserId}` }, (payload) => {
        const msg = payload.new as Message;
        if (msg.receiver_id === receiverId) {
          setMessages(prev => [msg, ...prev]);
        }
      }).subscribe();

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [channelType, receiverId, currentUserId]);

  const openChat = async () => {
    setLoading(true);
    try {
      const role = channelType === 'doctor' ? 'doctor' : 'admin';
      let receiverData = null;

      // 🌟 H-03: Prioritize assigned_coach_id for doctor channel
      if (channelType === 'doctor') {
        const { data: userProfile } = await supabase.from('profiles').select('assigned_coach_id').eq('id', currentUserId).single();
        if (userProfile?.assigned_coach_id) {
           const { data: coachData } = await supabase.from('profiles').select('id, updated_at').eq('id', userProfile.assigned_coach_id).single();
           receiverData = coachData;
        }
      }

      // Fallback to any generic role if not assigned or admin
      if (!receiverData) {
        const { data } = await supabase
          .from('profiles')
          .select('id, updated_at')
          .eq('role', role)
          .limit(1)
          .single();
        receiverData = data;
      }
      if (receiverData && currentUserId) {
        setReceiverId(receiverData.id);
        setLastSeen(receiverData.updated_at);
        const { data: messagesData } = await supabase
          .from('messages')
          .select('id, sender_id, receiver_id, content, attachment_url, attachment_type, recipient_type, is_read, created_at')
          .eq('recipient_type', role)
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverData.id}),and(sender_id.eq.${receiverData.id},receiver_id.eq.${currentUserId})`)
          .order('created_at', { ascending: false })
          .limit(30);
          
        if (messagesData) {
          setMessages(messagesData as Message[]);
          if (messagesData.length < 30) setHasMore(false);
        }

        // Mark messages as read
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('receiver_id', currentUserId)
          .eq('sender_id', receiverData.id)
          .eq('is_read', false);
      }
    } catch (err) {
      if (__DEV__) console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || !receiverId || !currentUserId) return;
    setLoadingMore(true);
    try {
      const role = channelType === 'doctor' ? 'doctor' : 'admin';
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) return;

      const { data: olderMessages } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, attachment_url, attachment_type, recipient_type, is_read, created_at')
        .eq('recipient_type', role)
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`)
        .lt('created_at', lastMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(30);

      if (olderMessages && olderMessages.length > 0) {
        setMessages(prev => [...prev, ...(olderMessages as Message[])]);
        if (olderMessages.length < 30) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      if (__DEV__) console.log(err);
    } finally {
      setLoadingMore(false);
    }
  };

  // 🖼️ اختيار صورة
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        const uriParts = file.uri.split('.');
        const fileExt = uriParts[uriParts.length - 1];
        setAttachment({
          uri: file.uri,
          name: `photo_${Date.now()}.${fileExt}`,
          mimeType: file.mimeType || `image/${fileExt}`,
        });
      }
    } catch (err) {
      Alert.alert('خطأ', 'لا يمكن الوصول للاستوديو');
    }
  };

  // 📄 اختيار ملف
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        setAttachment({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (err) {
      if (__DEV__) console.log(err);
    }
  };

  // 📎 قائمة اختيار المرفقات
  const handleAttachmentClick = () => {
    Alert.alert('إرفاق', 'اختر نوع المرفق الذي تريد إرساله', [
      { text: 'صورة من الاستوديو 🖼️', onPress: pickImage },
      { text: 'ملف / مستند 📄', onPress: pickDocument },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  };

  // 🎙️ بدء التسجيل
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

  // 🛑 إيقاف التسجيل
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

  // 📤 إرسال الرسالة
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

        const formData = new FormData();
        formData.append('file', {
          uri: attachment.uri,
          name: attachment.name,
          type: attachment.mimeType || 'application/octet-stream',
        } as any);

        const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, formData);
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
    messages,
    newMessage,
    setNewMessage,
    receiverId,
    loading,
    uploading,
    attachment,
    setAttachment,
    recording,
    isKeyboardVisible,
    recordingDuration,
    lastSeen,
    handleAttachmentClick,
    startRecording,
    stopRecording,
    sendMessage,
    loadMoreMessages,
    hasMore,
    loadingMore,
  };
}
