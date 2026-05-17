import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useFamily } from '../../src/context/FamilyContext';
import { useSubscriptionGuard } from '../../hooks/useSubscriptionGuard';
import LockedTabView from '../../components/LockedTabView';
import ExpiredState from '../../components/ExpiredState';
import ChatView from '../../components/ChatView';
import { AppColors } from '../../constants/AppTheme';
import { useRouter } from 'expo-router';

export default function ChatScreen() {
  const { currentProfile } = useFamily();
  const currentUserId = currentProfile?.id;
  const { userLifecycleState, isGuardLoading } = useSubscriptionGuard();
  const router = useRouter();

  if (isGuardLoading || !currentProfile) {
    return <ActivityIndicator size="large" color={AppColors.primary} style={{ flex: 1, marginTop: 50 }} />;
  }

  // 🔒 Lead — مقفول
  if (userLifecycleState === 'lead') {
    return (
      <LockedTabView
        icon="chatbubbles"
        iconColor="#8B5CF6"
        iconBg="#EDE9FE"
        title="اشترك لمراسلة الكوتش 💬"
        subtitle="سجل اشتراكك في Healix لتتمكن من التواصل المباشر مع الكوتش الطبي والحصول على المتابعة الشخصية."
        buttonText="اشترك الآن"
        onPress={() => router.push('/subscriptions')}
      />
    );
  }

  // 🔒 Expired — مقفول بالكامل
  if (userLifecycleState === 'expired') {
    return <ExpiredState />;
  }

  // 🔒 Onboarding — مقفول
  if (userLifecycleState === 'onboarding') {
    return (
      <LockedTabView
        icon="clipboard"
        iconColor={AppColors.primary}
        iconBg={AppColors.primaryLight}
        title="أكمل بياناتك أولاً 📋"
        subtitle="أكمل بياناتك الطبية ليتمكن الكوتش من دراسة حالتك والرد على استفساراتك."
        buttonText="الذهاب لإكمال البيانات"
        onPress={() => router.push('/(tabs)')}
      />
    );
  }

  return (
    <ChatView
      channelType="doctor"
      currentUserId={currentUserId}
      headerTitle="الكوتش الطبي"
      headerIcon="fitness"
      headerIconColor={AppColors.primary}
      headerIconBg={AppColors.primaryLight}
    />
  );
}