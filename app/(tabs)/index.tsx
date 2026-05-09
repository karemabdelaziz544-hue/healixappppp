import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscriptionGuard } from '../../hooks/useSubscriptionGuard';
import { useFamily } from '../../src/context/FamilyContext';

// Dashboard Views
import PaywallView from '../../components/dashboard/PaywallView';
import AssistantOnboardingView from '../../components/dashboard/AssistantOnboardingView';
import MainDashboardView from '../../components/dashboard/MainDashboardView';
import ExpiredState from '../../components/ExpiredState';
import Skeleton from '../../components/Skeleton';
import { AppColors } from '../../constants/AppTheme';

/**
 * DashboardController — Controller يعرض المكون المناسب لحالة العميل
 * =================================================================
 * 'loading'         → Skeleton
 * 'admin_or_doctor' → MainDashboardView
 * 'active'          → MainDashboardView
 * 'lead'            → PaywallView
 * 'expired'         → ExpiredState
 * 'onboarding'      → AssistantOnboardingView
 */
export default function DashboardController() {
  const { userLifecycleState, isGuardLoading } = useSubscriptionGuard();
  const { currentProfile } = useFamily();

  // 🛡️ حماية من الـ Loading Flash — لا نعرض أي شاشة حتى يكتمل التحميل
  if (isGuardLoading || userLifecycleState === 'loading' || !currentProfile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.background }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          <Skeleton width="100%" height={200} borderRadius={30} style={{ marginBottom: 30 }} />
          <Skeleton width="100%" height={100} borderRadius={25} style={{ marginBottom: 15 }} />
          <Skeleton width="100%" height={100} borderRadius={25} style={{ marginBottom: 15 }} />
          <Skeleton width="100%" height={100} borderRadius={25} />
        </View>
      </SafeAreaView>
    );
  }

  // 🔥 عملاء نشطين + الأدمن والدكتور → الداشبورد الكامل
  if (userLifecycleState === 'admin_or_doctor' || userLifecycleState === 'active') {
    return <MainDashboardView />;
  }

  // 💰 عميل جديد لم يدفع → شاشة الباقات
  if (userLifecycleState === 'lead') {
    return <PaywallView />;
  }

  // ⏰ اشتراك منتهي → شاشة التجديد
  if (userLifecycleState === 'expired') {
    return <ExpiredState />;
  }

  // 📋 عميل دفع ولم يكمل بياناته → مساعد التهيئة
  if (userLifecycleState === 'onboarding') {
    return <AssistantOnboardingView />;
  }

  return null;
}