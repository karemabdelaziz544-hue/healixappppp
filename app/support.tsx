import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useFamily } from '../src/context/FamilyContext';
import ChatView from '../components/ChatView';
import { AppColors } from '../constants/AppTheme';
import { useRouter } from 'expo-router';

export default function SupportScreen() {
  const { currentProfile } = useFamily();
  const currentUserId = currentProfile?.id;
  const router = useRouter();

  if (!currentProfile) {
    return <ActivityIndicator size="large" color={AppColors.primary} style={{ flex: 1, marginTop: 50 }} />;
  }

  return (
    <ChatView
      channelType="admin"
      currentUserId={currentUserId}
      headerTitle="خدمة العملاء"
      headerIcon="headset"
      headerIconColor="#3B82F6"
      headerIconBg="#EBF4FF"
      showBackButton
      onBack={() => router.back()}
    />
  );
}