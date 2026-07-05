import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Message } from '../src/types';
import { AppColors, AppRadius, AppFontFamily } from '../constants/AppTheme';
import { Strings } from '../constants/strings';
import { useChatSession } from '../src/features/chat/hooks/useChatSession';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { MessageBubble } from './chat/MessageBubble';
import { useRouter } from 'expo-router';

const SUGGESTIONS = [
  'أريد سؤال الكوتش عن تغذيتي اليومية 🍎',
  'هل يمكن تعديل بعض تمارين خطتي؟ 🏋️‍♂️',
  'أود استشارة الطبيب بشأن وعكة صحية خفيفة 🩺',
  'استفسار بخصوص مواعيد الوجبات والمكملات 📋',
];


// 🌟 المكون المشترك للشات
interface ChatViewProps {
  inquiryId: string;
  status: 'open' | 'under_review' | 'replied' | 'closed';
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
  inquiryId,
  status,
  currentUserId,
  headerTitle,
  headerIcon,
  headerIconColor,
  headerIconBg,
  showBackButton = false,
  onBack,
  showNetworkStatus = true,
}: ChatViewProps) {
  const router = useRouter();
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
  } = useChatSession(inquiryId, currentUserId);

  // 🔴 AUDIT FIX: Stable renderItem — no anonymous function re-creation
  const renderItem = useCallback(({ item: msg }: { item: Message }) => {
    const isMe = msg.sender_id === currentUserId;
    return <MessageBubble msg={msg} isMe={isMe} />;
  }, [currentUserId]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView style={styles.chatContainer}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
        <View style={styles.chatHeader}>
          {showBackButton && onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityLabel={Strings.common.back} accessibilityRole="button">
              <Ionicons name="arrow-back" size={24} color={AppColors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleBox}>
            <Text style={styles.chatHeaderTitle}>{headerTitle}</Text>
            {lastSeen && (
              <Text style={{ fontSize: 11, color: AppColors.textMuted, marginTop: 2, fontWeight: 'bold' }}>
                {Strings.chat.lastSeen} {new Date(lastSeen).toLocaleDateString('ar-EG')} {new Date(lastSeen).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
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
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            inverted={true}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={true}
            windowSize={15}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={AppColors.primary} style={{ marginVertical: 10 }} /> : null}
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={AppColors.textMuted} />
                <Text style={styles.emptyStateText}>{Strings.chat.noMessages}</Text>
                <Text style={styles.emptyStateSubtext}>{Strings.chat.startChat}</Text>
                
                <View style={styles.suggestionsContainer}>
                  {SUGGESTIONS.map((suggestion, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.suggestionChip} 
                      onPress={() => setNewMessage(suggestion)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
          />
        )}

        <View style={[styles.inputArea, !isKeyboardVisible && { paddingBottom: Platform.OS === 'ios' ? 90 : 80 }]}>
          {showNetworkStatus && !isConnected && (
            <View style={styles.offlineBar}>
              <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
              <Text style={styles.offlineBarText}>{Strings.chat.noInternetSend}</Text>
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

          {status === 'closed' ? (
            <View style={styles.closedInquiryBar}>
              <Ionicons name="checkmark-circle" size={20} color={AppColors.success} />
              <Text style={styles.closedBarText}>تم حل هذا الاستفسار وإغلاقه بواسطة الكوتش ✓</Text>
              <TouchableOpacity 
                style={styles.reopenActionBtn} 
                onPress={() => router.replace('/chat')}
              >
                <Text style={styles.reopenActionText}>لديك سؤال آخر؟ اسأل الكوتش</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
                <Text style={styles.recordingLabel}>{Strings.chat.recording}</Text>
              </View>
            ) : (
              <TextInput style={styles.textInput} placeholder={Strings.chat.placeholder} value={newMessage} onChangeText={setNewMessage} multiline editable={!uploading} />
            )}

            {(newMessage.trim().length > 0 || attachment) ? (
              <TouchableOpacity
                style={[styles.sendBtn, !isConnected && { opacity: 0.4 }]}
                onPress={sendMessage}
                disabled={uploading || !isConnected}
                accessibilityLabel={Strings.common.send}
                accessibilityRole="button"
              >
                {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.micBtn, recording ? styles.recordingBtn : null]}
                onPress={recording ? stopRecording : startRecording}
                accessibilityLabel={recording ? Strings.chat.stopRecording : Strings.chat.voiceRecord}
                accessibilityRole="button"
              >
                <Ionicons name={recording ? 'stop' : 'mic'} size={24} color={recording ? '#FFF' : AppColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          )}
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
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40, paddingHorizontal: 20, transform: [{ scaleY: -1 }] },
  emptyStateText: { fontSize: 16, color: AppColors.textPrimary, fontWeight: 'bold', marginTop: 10 },
  emptyStateSubtext: { fontSize: 14, color: AppColors.textMuted, marginTop: 5 },

  inputArea: { backgroundColor: AppColors.surface, borderTopWidth: 1, borderTopColor: AppColors.border, flexDirection: 'column' },
  previewBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: AppColors.inputBg, margin: 10, borderRadius: 10 },
  previewText: { fontSize: 12, color: AppColors.textPrimary, flex: 1, textAlign: 'right', marginRight: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 15 },
  iconBtn: { padding: 5 },
  textInput: { flex: 1, backgroundColor: AppColors.inputBg, minHeight: 45, maxHeight: 100, borderRadius: 25, paddingHorizontal: 15, paddingTop: 12, textAlign: 'right', fontSize: 15, marginHorizontal: 10 },
  sendBtn: { width: 45, height: 45, backgroundColor: AppColors.primary, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  micBtn: { padding: 5 },
  recordingBtn: { backgroundColor: AppColors.danger, borderRadius: 25, padding: 10 },

  offlineBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: AppColors.danger, paddingHorizontal: 15, paddingVertical: 8 },
  offlineBarText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', flex: 1, textAlign: 'right' },

  recordingBar: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: AppColors.dangerBg, borderRadius: 25, marginHorizontal: 10, paddingHorizontal: 15, height: 45, gap: 10 },
  recordingPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.danger },
  recordingTimerText: { fontSize: 18, fontWeight: '900', color: AppColors.danger, fontVariant: ['tabular-nums'] },
  recordingLabel: { fontSize: 13, fontWeight: 'bold', color: AppColors.textMuted },

  // Suggestions styles
  suggestionsContainer: {
    marginTop: 20,
    width: '100%',
  },
  suggestionChip: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: AppRadius.md,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionText: {
    color: AppColors.primary,
    fontFamily: AppFontFamily.medium,
    textAlign: 'center',
  },
  closedInquiryBar: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    gap: 8,
  },
  closedBarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  reopenActionBtn: {
    marginTop: 5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: AppColors.primary,
    borderRadius: 20,
  },
  reopenActionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  }
});
