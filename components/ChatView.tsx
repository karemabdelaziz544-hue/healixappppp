import { Text, TextInput } from '@/components/AppText';
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Message } from '../src/types';
import { AppColors, AppRadius, AppFontFamily } from '../constants/AppTheme';
import { Strings } from '../constants/strings';
import { useChatSession } from '../src/features/chat/hooks/useChatSession';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { MessageBubble } from './chat/MessageBubble';
import { useRouter } from 'expo-router';

const QUICK_ACTIONS = ['الاشتراك', 'الدفع', 'إضافة حساب فرعي', 'تحميل التقارير'];

const getMessageDateLabel = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'اليوم';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'أمس';
  } else {
    const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return `${date.getDate()} ${monthsAr[date.getMonth()]}`;
  }
};

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

  const renderItem = useCallback(({ item: msg, index }: { item: Message; index: number }) => {
    const isMe = msg.sender_id === currentUserId;
    
    // Determine if we need to show a date separator ( FlatList is inverted, so index + 1 is older )
    const nextMsg = messages[index + 1];
    const showDateSeparator = !nextMsg || new Date(msg.created_at).toDateString() !== new Date(nextMsg.created_at).toDateString();
    
    return (
      <View style={{ width: '100%' }}>
        {showDateSeparator ? (
          <View style={styles.dateSeparatorContainer}>
            <View style={styles.dateSeparatorBox}>
              <Text style={styles.dateSeparatorText}>📌 {headerTitle} — {getMessageDateLabel(msg.created_at)}</Text>
            </View>
          </View>
        ) : null}
        <MessageBubble msg={msg} isMe={isMe} />
      </View>
    );
  }, [currentUserId, messages, headerTitle]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView style={styles.chatContainer}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Premium Header */}
        <View style={styles.chatHeader}>
          <View style={styles.headerRight}>
            {showBackButton && onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityLabel={Strings.common.back}>
                <Ionicons name="arrow-forward" size={24} color="#004532" />
              </TouchableOpacity>
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.chatHeaderTitle}>{headerTitle}</Text>
              <Text style={styles.chatHeaderSubtitle}>نسعد بمساعدتك في أي وقت</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.menuBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color="#3f4944" />
          </TouchableOpacity>
        </View>

        {loading && messages.length === 0 ? (
          <ActivityIndicator size="large" color="#004532" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            style={styles.messagesArea}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}
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
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#004532" style={{ marginVertical: 10 }} /> : null}
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>{Strings.chat.noMessages}</Text>
                <Text style={styles.emptyStateSubtext}>{Strings.chat.startChat}</Text>
              </View>
            }
          />
        )}

        {/* Footer & Composer */}
        <View style={[styles.footerContainer, !isKeyboardVisible && { paddingBottom: Platform.OS === 'ios' ? 24 : 12 }]}>
          {/* Quick Actions ScrollView */}
          {status !== 'closed' && (
            <View style={styles.quickActionsContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.quickActionsScroll}
              >
                {QUICK_ACTIONS.map((action, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.quickActionChip} 
                    onPress={() => setNewMessage(action)}
                  >
                    <Text style={styles.quickActionText}>{action}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Network offline bar */}
          {showNetworkStatus && !isConnected && (
            <View style={styles.offlineBar}>
              <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
              <Text style={styles.offlineBarText}>{Strings.chat.noInternetSend}</Text>
            </View>
          )}

          {/* Attachment Preview */}
          {attachment ? (
            <View style={styles.previewBox}>
              <Text numberOfLines={1} style={styles.previewText}>{attachment.name}</Text>
              <TouchableOpacity onPress={() => setAttachment(null)}>
                <Ionicons name="close-circle" size={22} color={AppColors.danger} />
              </TouchableOpacity>
            </View>
          ) : null}

          {status === 'closed' ? (
            <View style={styles.closedInquiryBar}>
              <Ionicons name="checkmark-circle" size={22} color={AppColors.success} />
              <Text style={styles.closedBarText}>تم حل هذا الاستفسار وإغلاقه بواسطة الكوتش ✓</Text>
              <TouchableOpacity 
                style={styles.reopenActionBtn} 
                onPress={() => router.replace('/chat')}
              >
                <Text style={styles.reopenActionText}>لديك سؤال آخر؟ اسأل الكوتش</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.composerWrapper}>
              <View style={styles.composerContainer}>
                <TouchableOpacity 
                  style={styles.composerAddBtn} 
                  onPress={handleAttachmentClick} 
                  disabled={uploading || !!recording || !isConnected}
                >
                  <Ionicons name="add" size={24} color="#3f4944" />
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
                  <TextInput 
                    style={styles.composerInput} 
                    placeholder="اكتب رسالتك هنا..." 
                    value={newMessage} 
                    onChangeText={setNewMessage} 
                    multiline 
                    editable={!uploading} 
                  />
                )}

                {(newMessage.trim().length > 0 || attachment) ? (
                  <TouchableOpacity
                    style={[styles.composerSendBtn, !isConnected && { opacity: 0.4 }]}
                    onPress={sendMessage}
                    disabled={uploading || !isConnected}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons name="send" size={18} color="#FFF" style={{ transform: [{ rotate: '180deg' }] }} />
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.composerMicBtn, recording ? styles.recordingBtnActive : null]}
                    onPress={recording ? stopRecording : startRecording}
                    disabled={!isConnected}
                  >
                    <Ionicons name={recording ? 'stop' : 'mic'} size={22} color={recording ? '#FFF' : '#3f4944'} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chatContainer: { flex: 1, backgroundColor: '#f7faf6' },
  chatHeader: { 
    flexDirection: 'row', // RTL standard
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#f7faf6', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
  },
  headerRight: {
    flexDirection: 'row', // RTL standard
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  headerTextContainer: {
    alignItems: 'flex-start',
  },
  chatHeaderTitle: { 
    fontSize: 24, 
    fontFamily: AppFontFamily.bold, 
    color: '#004532',
    textAlign: 'left',
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    fontFamily: AppFontFamily.regular,
    color: '#3f4944',
    marginTop: 2,
  },
  menuBtn: {
    padding: 8,
  },

  messagesArea: { flex: 1 },
  emptyStateContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 64, 
    paddingHorizontal: 20, 
    transform: [{ scaleY: -1 }] 
  },
  emptyStateText: { 
    fontSize: 16, 
    color: '#181c1a', 
    fontFamily: AppFontFamily.bold, 
    marginTop: 12 
  },
  emptyStateSubtext: { 
    fontSize: 14, 
    color: '#3f4944', 
    marginTop: 6 
  },

  footerContainer: {
    backgroundColor: '#f7faf6',
  },

  quickActionsContainer: {
    paddingVertical: 12,
    width: '100%',
  },
  quickActionsScroll: {
    flexDirection: 'row', // RTL standard
    paddingHorizontal: 16,
    gap: 8,
  },
  quickActionChip: {
    backgroundColor: '#e0e3df',
    borderColor: 'rgba(190, 201, 194, 0.3)',
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    color: '#181c1a',
    fontSize: 14,
    fontFamily: AppFontFamily.bold,
  },

  previewBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 12, 
    backgroundColor: '#ffffff', 
    borderColor: '#bec9c2',
    borderWidth: 1,
    marginHorizontal: 16, 
    marginBottom: 8,
    borderRadius: 16 
  },
  previewText: { 
    fontSize: 12, 
    color: '#181c1a', 
    flex: 1, 
    textAlign: 'left', // RTL Natural Flow
    marginEnd: 10,
    fontFamily: AppFontFamily.regular,
  },

  offlineBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: AppColors.danger, 
    paddingHorizontal: 16, 
    paddingVertical: 8,
    marginBottom: 8,
  },
  offlineBarText: { 
    color: '#FFF', 
    fontSize: 12, 
    fontFamily: AppFontFamily.bold, 
    flex: 1, 
    textAlign: 'left' 
  },

  // Date Separator styles
  dateSeparatorContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 16,
    // NO transform! FlatList with inverted={true} already handles the orientation!
  },
  dateSeparatorBox: {
    backgroundColor: '#d3e3dc',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  dateSeparatorText: {
    color: '#566660',
    fontSize: 12,
    fontFamily: AppFontFamily.bold,
    textAlign: 'center',
  },

  // Composer styles
  composerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  composerContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#bec9c2',
    borderWidth: 1,
    borderRadius: 24,
    padding: 8,
    flexDirection: 'row', // RTL standard
    alignItems: 'center',
    gap: 8,
    shadowColor: '#065f46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  composerAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 8,
    fontSize: 16,
    fontFamily: AppFontFamily.regular,
    color: '#181c1a',
    textAlign: 'right', // Explicit right align for text input placeholder
  },
  composerSendBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#004532',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  composerMicBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingBtnActive: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
  },

  recordingBar: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: AppColors.dangerBg, 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    height: 40, 
    gap: 10 
  },
  recordingPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.danger },
  recordingTimerText: { fontSize: 16, fontFamily: AppFontFamily.bold, color: AppColors.danger },
  recordingLabel: { fontSize: 13, fontFamily: AppFontFamily.regular, color: AppColors.textMuted },

  closedInquiryBar: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  closedBarText: {
    fontSize: 14,
    fontFamily: AppFontFamily.bold,
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
    fontFamily: AppFontFamily.bold,
  }
});
