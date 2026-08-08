import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/AppText';
import { useFamily } from '../../src/context/FamilyContext';
import ChatView from '../../components/ChatView';
import { AppColors } from '../../constants/AppTheme';
import { useEntitlements } from '../../src/features/subscriptions/useEntitlements';
import { PremiumGate } from '../../src/components/PremiumGate';

export default function InquiryChatScreen() {
  const router = useRouter();
  const { currentProfile } = useFamily();
  const { canUse, userRole } = useEntitlements();
  const currentUserId = currentProfile?.id;
  
  const { id, status, title } = useLocalSearchParams<{ id: string; status: 'open' | 'under_review' | 'replied' | 'closed'; title: string }>();

  if (!currentUserId || !id) {
    return <ActivityIndicator size="large" color={AppColors.primary} style={{ flex: 1, marginTop: 50 }} />;
  }

  if (!canUse('DOCTOR_CHAT') && userRole !== 'admin' && userRole !== 'doctor') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={24} color={AppColors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontFamily: 'Thmanyah-Bold', fontSize: 18, color: '#111827' }}>محادثة الطبيب المعالج</Text>
        </View>
        <PremiumGate featureId="DOCTOR_CHAT" screenName="InquiryChatScreen" />
      </SafeAreaView>
    );
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
