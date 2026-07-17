import React, { useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TextInput } from '@/components/AppText';
import { AppColors, AppFontFamily, AppRadius, AppSpacing } from '@/constants/AppTheme';
import { useHealixAI } from '../hooks/useHealixAI';
import { AIHeader } from '../components/AIHeader';
import { AIWelcome } from '../components/AIWelcome';
import { AISuggestionList } from '../components/AISuggestionChip';
import { AIMessageBubble } from '../components/AIMessageBubble';
import { AITypingIndicator } from '../components/AITypingIndicator';
import { showToast } from '@/components/AppToast';
import { AIMessage } from '../types';

export default function HealixAIScreen() {
  const router = useRouter();
  const { conversation, loading, sendMessage } = useHealixAI();
  const [inputText, setInputText] = React.useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  }, [inputText, sendMessage]);

  const handleSelectSuggestion = useCallback((suggestion: string) => {
    sendMessage(suggestion);
  }, [sendMessage]);

  const handleAttachmentPress = useCallback(() => {
    showToast.error('سيتم دعم إرسال الصور قريبًا');
  }, []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  const renderItem = useCallback(({ item }: { item: AIMessage }) => {
    return <AIMessageBubble message={item} />;
  }, []);

  const keyExtractor = useCallback((item: AIMessage) => item.id, []);

  // Sort messages to show newest first for the inverted FlatList
  const invertedMessages = React.useMemo(() => {
    return [...conversation.messages].reverse();
  }, [conversation.messages]);

  const showWelcome = conversation.messages.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <AIHeader onBack={handleBack} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.chatArea}>
          {showWelcome ? (
            <View style={styles.emptyContainer}>
              <AIWelcome />
              <View style={styles.suggestionsWrapper}>
                <Text style={styles.suggestionsTitle}>أسئلة مقترحة</Text>
                <AISuggestionList onSelect={handleSelectSuggestion} />
              </View>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={invertedMessages}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              inverted
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              ListHeaderComponent={loading ? <AITypingIndicator /> : null}
            />
          )}
        </View>

        {/* Input Composer Area */}
        <View style={styles.composerWrapper}>
          <View style={styles.composerContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.attachButton}
              onPress={handleAttachmentPress}
            >
              <Ionicons name="add-circle-outline" size={26} color={AppColors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="اسألني عن التغذية أو السعرات..."
              placeholderTextColor={AppColors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Ionicons
                name="send"
                size={18}
                color={AppColors.surface}
                style={styles.sendIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: AppSpacing.xxl,
  },
  suggestionsWrapper: {
    width: '100%',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontFamily: AppFontFamily.bold,
    color: AppColors.primary,
    paddingHorizontal: AppSpacing.lg,
    marginBottom: AppSpacing.xs,
    textAlign: 'left',
  },
  listContent: {
    paddingHorizontal: AppSpacing.lg,
    paddingTop: AppSpacing.md,
    paddingBottom: AppSpacing.md,
  },
  composerWrapper: {
    backgroundColor: AppColors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 75, 70, 0.05)',
    paddingHorizontal: AppSpacing.lg,
    paddingTop: AppSpacing.sm,
    paddingBottom: Platform.OS === 'ios' ? AppSpacing.xl : AppSpacing.md,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.xxl,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(42, 75, 70, 0.08)',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  attachButton: {
    padding: AppSpacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 14,
    fontFamily: AppFontFamily.regular,
    color: AppColors.textPrimary,
    paddingHorizontal: AppSpacing.sm,
    textAlign: 'left',
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: AppColors.tabInactive,
    opacity: 0.6,
  },
  sendIcon: {
    transform: [{ rotate: '180deg' }], // RTL standard send rotation
  },
});
