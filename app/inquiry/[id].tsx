import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useFamily } from '../../src/context/FamilyContext';
import ChatView from '../../components/ChatView';
import { AppColors } from '../../constants/AppTheme';

export default function InquiryChatScreen() {
  const router = useRouter();
  const { currentProfile } = useFamily();
  const currentUserId = currentProfile?.id;
  
  // Destructure parameters passed during navigation
  const { id, status, title } = useLocalSearchParams<{ id: string; status: 'open' | 'under_review' | 'replied' | 'closed'; title: string }>();

  if (!currentUserId || !id) {
    return <ActivityIndicator size="large" color={AppColors.primary} style={{ flex: 1, marginTop: 50 }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: AppColors.background }}>
      <ChatView
        inquiryId={id}
        status={status || 'open'}
        currentUserId={currentUserId}
        headerTitle={title || 'استفسار'}
        headerIcon="help-circle"
        headerIconColor={AppColors.primary}
        headerIconBg={AppColors.primaryLight}
        showBackButton={true}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/chat');
          }
        }}
      />
    </View>
  );
}
