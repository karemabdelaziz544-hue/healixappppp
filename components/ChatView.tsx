import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, Image, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';
import { supabase } from '../src/lib/supabase';
import type { Message } from '../src/types';
import { AppColors } from '../constants/AppTheme';
import { useChatSession, ChannelType } from '../src/features/chat/hooks/useChatSession';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// 🌟 مُشغل المرفقات الداخلي (صور - فويس - ملفات)
const InlineAttachment = ({ path, type, isMe }: { path: string; type: string; isMe: boolean }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // 🔴 H2-FIX: Use a ref to hold the sound object for cleanup,
  // so the cleanup effect doesn't depend on the `sound` state (which caused the loop).
  const soundRef = useRef<Audio.Sound | null>(null);

  // Effect 1: Fetch signed URL — runs only when `path` changes.
  // Previously this effect also depended on `sound`, causing an infinite loop:
  // sound state update → effect re-runs → cleanup unloads sound → repeat.
  useEffect(() => {
    let isMounted = true;
    const fetchUrl = async () => {
      try {
        if (path.startsWith('http')) {
          if (isMounted) { setSignedUrl(path); setLoading(false); }
          return;
        }
        // 🔴 H2-FIX: Reduced TTL from 604800 (7 days) to 7200 (2 hours).
        // Medical images accessible via URL for 7 days is a security risk.
        const { data } = await supabase.storage.from('chat-attachments').createSignedUrl(path, 7200);
        if (data && isMounted) setSignedUrl(data.signedUrl);
      } catch (e) {
        if (__DEV__) console.log(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUrl();
    return () => { isMounted = false; };
  }, [path]); // Only re-run when path changes — NOT when sound changes

  // Effect 2: Cleanup sound on unmount only.
  // Separated from the fetch effect to avoid the re-trigger cycle.
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const toggleAudio = async () => {
    if (!signedUrl) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: signedUrl },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlaying(false);
              newSound.setPositionAsync(0);
            } else if (!status.isLoaded && status.error) {
              setIsPlaying(false);
            }
          }
        );
        soundRef.current = newSound; // sync ref for cleanup
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (e) {
      if (__DEV__) console.log('Audio play error', e);
      setIsPlaying(false);
    }
  };

  if (loading) return <ActivityIndicator size="small" color={isMe ? '#FFF' : AppColors.primary} style={{ marginTop: 10 }} />;
  if (!signedUrl) return null;

  if (type === 'image') {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(signedUrl)}>
        <Image source={{ uri: signedUrl }} style={styles.inlineImage} resizeMode="cover" />
      </TouchableOpacity>
    );
  }

  if (type === 'audio') {
    return (
      <View style={[styles.inlineAudioBox, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(42,75,70,0.05)' }]}>
        <TouchableOpacity onPress={toggleAudio} style={[styles.audioPlayBtn, { backgroundColor: isMe ? '#FFF' : AppColors.primary }]}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={isMe ? AppColors.primary : '#FFF'} style={{ marginLeft: isPlaying ? 0 : 4 }} />
        </TouchableOpacity>
        <Text style={[styles.audioText, { color: isMe ? '#FFF' : AppColors.textPrimary }]}>
          {isPlaying ? 'جاري التشغيل...' : 'رسالة صوتية'}
        </Text>
      </View>
    );
  }

  const fileLabel = path.split('.').pop()?.toUpperCase() || 'ملف';

  return (
    <TouchableOpacity onPress={() => Linking.openURL(signedUrl)} style={[styles.inlineFileBox, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(42,75,70,0.05)' }]}>
      <Ionicons name="document-text" size={18} color={isMe ? '#FFF' : AppColors.primary} />
      <Text style={{ fontSize: 13, fontWeight: 'bold', color: isMe ? '#FFF' : AppColors.primary }}>فتح الملف ({fileLabel})</Text>
    </TouchableOpacity>
  );
};

// 🌟 المكون المشترك للشات
interface ChatViewProps {
  channelType: ChannelType;
  currentUserId: string | undefined;
  headerTitle: string;
  headerIcon: string;
  headerIconColor: string;
  headerIconBg: string;
  showBackButton?: boolean;
  onBack?: () => void;
  showNetworkStatus?: boolean;
}

export default function ChatView({
  channelType,
  currentUserId,
  headerTitle,
  headerIcon,
  headerIconColor,
  headerIconBg,
  showBackButton = false,
  onBack,
  showNetworkStatus = true,
}: ChatViewProps) {
  const { isConnected } = useNetworkStatus();
  const {
    messages,
    newMessage,
    setNewMessage,
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
  } = useChatSession(channelType, currentUserId);

  return (
    <SafeAreaView style={styles.chatContainer}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
        <View style={styles.chatHeader}>
          {showBackButton && onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityLabel="رجوع" accessibilityRole="button">
              <Ionicons name="arrow-back" size={24} color={AppColors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleBox}>
            <Text style={styles.chatHeaderTitle}>{headerTitle}</Text>
            {lastSeen && (
              <Text style={{ fontSize: 11, color: AppColors.textMuted, marginTop: 2, fontWeight: 'bold' }}>
                آخر ظهور: {new Date(lastSeen).toLocaleDateString('ar-EG')} {new Date(lastSeen).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <View style={[styles.headerAvatar, { backgroundColor: headerIconBg }]}>
            <Ionicons name={headerIcon as keyof typeof Ionicons.glyphMap} size={20} color={headerIconColor} />
          </View>
        </View>

        {loading && messages.length === 0 ? (
          <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            style={styles.messagesArea}
            contentContainerStyle={{ padding: 15 }}
            data={messages}
            keyExtractor={(item) => item.id}
            inverted={true}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={AppColors.primary} style={{ marginVertical: 10 }} /> : null}
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={AppColors.textMuted} />
                <Text style={styles.emptyStateText}>لا توجد رسائل حتى الآن.</Text>
                <Text style={styles.emptyStateSubtext}>ابدأ المحادثة الآن!</Text>
              </View>
            }
            renderItem={({ item: msg }) => {
              const isMe = msg.sender_id === currentUserId;
              const msgTime = new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
              return (
                <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
                  <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                    {msg.content ? (
                      <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                        {msg.content}
                      </Text>
                    ) : null}

                    {msg.attachment_url ? (
                      <InlineAttachment path={msg.attachment_url} type={msg.attachment_type || 'file'} isMe={isMe} />
                    ) : null}

                    <View style={styles.messageFooter}>
                      <Text style={[styles.messageTime, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: AppColors.textMuted }]}>
                        {msgTime}
                      </Text>
                      {isMe && (
                        <Ionicons
                          name={msg.is_read ? 'checkmark-done' : 'checkmark'}
                          size={14}
                          color={msg.is_read ? '#4ADE80' : 'rgba(255,255,255,0.7)'}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={[styles.inputArea, !isKeyboardVisible && { paddingBottom: Platform.OS === 'ios' ? 90 : 80 }]}>
          {/* Offline banner */}
          {showNetworkStatus && !isConnected && (
            <View style={styles.offlineBar}>
              <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
              <Text style={styles.offlineBarText}>لا يوجد اتصال بالإنترنت — لا يمكن الإرسال</Text>
            </View>
          )}
          {attachment ? (
            <View style={styles.previewBox}>
              <Text numberOfLines={1} style={styles.previewText}>{attachment.name}</Text>
              <TouchableOpacity onPress={() => setAttachment(null)}>
                <Ionicons name="close-circle" size={20} color={AppColors.danger} />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleAttachmentClick} disabled={uploading || !!recording || !isConnected}>
              <Ionicons name="attach" size={28} color={AppColors.textSecondary} />
            </TouchableOpacity>

            {recording ? (
              <View style={styles.recordingBar}>
                <View style={styles.recordingPulse} />
                <Text style={styles.recordingTimerText}>
                  {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}
                </Text>
                <Text style={styles.recordingLabel}>جاري التسجيل...</Text>
              </View>
            ) : (
              <TextInput style={styles.textInput} placeholder="اكتب رسالتك..." value={newMessage} onChangeText={setNewMessage} multiline editable={!uploading} />
            )}

            {(newMessage.trim().length > 0 || attachment) ? (
              <TouchableOpacity
                style={[styles.sendBtn, !isConnected && { opacity: 0.4 }]}
                onPress={sendMessage}
                disabled={uploading || !isConnected}
                accessibilityLabel="إرسال"
                accessibilityRole="button"
              >
                {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.micBtn, recording ? styles.recordingBtn : null]}
                onPress={recording ? stopRecording : startRecording}
                accessibilityLabel={recording ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
                accessibilityRole="button"
              >
                <Ionicons name={recording ? 'stop' : 'mic'} size={24} color={recording ? '#FFF' : AppColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chatContainer: { flex: 1, backgroundColor: AppColors.inputBg },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: AppColors.surface, padding: 15, borderBottomWidth: 1, borderBottomColor: AppColors.border, elevation: 2 },
  backBtn: { padding: 5 },
  headerTitleBox: { alignItems: 'flex-end', flex: 1, paddingRight: 15 },
  chatHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: AppColors.textPrimary },
  headerAvatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  messagesArea: { flex: 1 },
  messageWrapper: { marginBottom: 15, flexDirection: 'row' },
  // ✅ RTL العربي الصحيح: رسائلي على اليسار، رسائلهم على اليمين
  myMessageWrapper: { justifyContent: 'flex-start' },
  theirMessageWrapper: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '80%', padding: 15, borderRadius: 20 },
  myBubble: { backgroundColor: AppColors.primary, borderBottomLeftRadius: 5 },
  theirBubble: { backgroundColor: AppColors.surface, borderBottomRightRadius: 5, borderWidth: 1, borderColor: AppColors.border },
  messageText: { fontSize: 15, lineHeight: 22 },
  myMessageText: { color: '#FFF' },
  theirMessageText: { color: AppColors.textPrimary },
  messageFooter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 5 },
  messageTime: { fontSize: 10, fontWeight: 'bold' },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, transform: [{ scaleY: -1 }] }, // Reverse transform to offset inverted FlatList
  emptyStateText: { fontSize: 16, color: AppColors.textPrimary, fontWeight: 'bold', marginTop: 10 },
  emptyStateSubtext: { fontSize: 14, color: AppColors.textMuted, marginTop: 5 },

  inlineImage: { width: 220, height: 220, borderRadius: 15, marginTop: 10, backgroundColor: 'rgba(0,0,0,0.1)' },
  inlineAudioBox: { flexDirection: 'row-reverse', alignItems: 'center', padding: 10, borderRadius: 15, marginTop: 10, minWidth: 180, alignSelf: 'flex-end' },
  audioPlayBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  audioText: { marginRight: 15, fontSize: 13, fontWeight: 'bold' },
  inlineFileBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 10, padding: 10, borderRadius: 10, alignSelf: 'flex-end' },

  inputArea: { backgroundColor: AppColors.surface, borderTopWidth: 1, borderTopColor: AppColors.border, flexDirection: 'column' },
  previewBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: AppColors.inputBg, margin: 10, borderRadius: 10 },
  previewText: { fontSize: 12, color: AppColors.textPrimary, flex: 1, textAlign: 'right', marginRight: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 15 },
  iconBtn: { padding: 5 },
  textInput: { flex: 1, backgroundColor: AppColors.inputBg, minHeight: 45, maxHeight: 100, borderRadius: 25, paddingHorizontal: 15, paddingTop: 12, textAlign: 'right', fontSize: 15, marginHorizontal: 10 },
  // ✅ إزالة transform rotate — أيقونة send تعمل بشكل صحيح بدون قلب
  sendBtn: { width: 45, height: 45, backgroundColor: AppColors.primary, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  micBtn: { padding: 5 },
  recordingBtn: { backgroundColor: AppColors.danger, borderRadius: 25, padding: 10 },

  offlineBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: AppColors.danger, paddingHorizontal: 15, paddingVertical: 8 },
  offlineBarText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', flex: 1, textAlign: 'right' },

  recordingBar: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: AppColors.dangerBg, borderRadius: 25, marginHorizontal: 10, paddingHorizontal: 15, height: 45, gap: 10 },
  recordingPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.danger },
  recordingTimerText: { fontSize: 18, fontWeight: '900', color: AppColors.danger, fontVariant: ['tabular-nums'] },
  recordingLabel: { fontSize: 13, fontWeight: 'bold', color: AppColors.textMuted },
});
