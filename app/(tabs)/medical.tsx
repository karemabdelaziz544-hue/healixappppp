import { Text } from '@/components/AppText';
import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';;
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { logger } from '../../src/lib/logger';
import { useFamily } from '../../src/context/FamilyContext';
import { useSubscriptionGuard } from '../../hooks/useSubscriptionGuard';
import Skeleton from '../../components/Skeleton';
import ExpiredState from '../../components/ExpiredState';
import LockedTabView from '../../components/LockedTabView';
import type { InbodyRecord, ClientDocument, HealthProfile, LifestyleProfile } from '../../src/types';
import { AppCache } from '../../src/lib/cache';

import { medicalStyles as styles } from '../../src/features/medical/medicalStyles';
import { AppColors } from '../../constants/AppTheme';
import InBodyTab from '../../src/features/medical/InBodyTab';
import DocumentsTab from '../../src/features/medical/DocumentsTab';
import HealthProfileTab from '../../src/features/medical/HealthProfileTab';
import LifestyleProfileTab from '../../src/features/medical/LifestyleProfileTab';
import { useRouter } from 'expo-router';
import { AnimatedButton } from '../../components/animations/AnimatedButton';
import { FadeInView } from '../../components/animations/FadeInView';
import { SlideInView } from '../../components/animations/SlideInView';

export default function MedicalRecordsScreen() {
  const { currentProfile } = useFamily();
  const { userLifecycleState, isGuardLoading } = useSubscriptionGuard();
  const userId = currentProfile?.id;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'inbody' | 'docs' | 'health' | 'lifestyle'>('inbody');
  
  // Data states
  const [inbodyRecords, setInbodyRecords] = useState<InbodyRecord[]>([]);
  const [docs, setDocs] = useState<ClientDocument[]>([]);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [lifestyleProfile, setLifestyleProfile] = useState<LifestyleProfile | null>(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadCachedData = useCallback(async () => {
    if (!userId) return;
    try {
      const cached = await AppCache.get<{
        inbodyRecords: InbodyRecord[];
        docs: ClientDocument[];
        healthProfile: HealthProfile | null;
        lifestyleProfile: LifestyleProfile | null;
      }>(`medical_${userId}`);
      
      if (cached) {
        setInbodyRecords(cached.inbodyRecords);
        setDocs(cached.docs);
        setHealthProfile(cached.healthProfile);
        setLifestyleProfile(cached.lifestyleProfile);
        setLoading(false);
      }
    } catch (e) {
      logger.error('Error loading cached medical data:', e);
    }
  }, [userId]);

  const fetchAllData = useCallback(async () => {
    if (!userId) return;
    try {
      const [inbodyRecordsVal, docsVal, profilesVal] = await Promise.all([
        fetchInbody(),
        fetchDocs(),
        fetchProfiles()
      ]);
      
      await AppCache.set(`medical_${userId}`, {
        inbodyRecords: inbodyRecordsVal,
        docs: docsVal,
        healthProfile: profilesVal.health,
        lifestyleProfile: profilesVal.life
      });
    } catch (error) {
      logger.error('Error fetching all medical data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      loadCachedData().then(() => {
        fetchAllData();
      });
    }
  }, [fetchAllData, loadCachedData, userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  const fetchProfiles = async () => {
    const { data: health } = await supabase.from('health_profile').select('id, user_id, diseases, has_allergies, allergies_details, diet_type, family_history, medications, surgeries, injuries, digestive_issues, hormonal_status').eq('user_id', userId).maybeSingle();
    const currentHealth = health || null;
    setHealthProfile(currentHealth);

    const { data: life } = await supabase.from('lifestyle_profile').select('id, user_id, goal, meals_per_day, has_breakfast, has_snacks, late_night_eating, favorite_foods, disliked_foods, water_liters, beverages, activity_level, does_exercise, exercise_details, sleep_hours, sleep_quality, smoker, stress_level, work_nature, emotional_eating, diet_history, supplements, caffeine_intake, appetite_level, weight_plateau').eq('user_id', userId).maybeSingle();
    const currentLife = life || null;
    setLifestyleProfile(currentLife);
    
    return { health: currentHealth, life: currentLife };
  };

  const fetchInbody = async () => {
    const { data } = await supabase.from('inbody_records').select('id, user_id, weight, muscle_mass, fat_percent, record_date, ai_summary, image_url').eq('user_id', userId).order('record_date', { ascending: true });
    const records = data || [];
    setInbodyRecords(records);
    return records;
  };

  const fetchDocs = async () => {
    const { data } = await supabase.from('client_documents').select('id, user_id, file_name, file_url, file_type, created_at').eq('user_id', userId).order('created_at', { ascending: false });
    const docsList = data || [];
    setDocs(docsList);
    return docsList;
  };

  // 🛡️ Loading State — Skeleton
  if (isGuardLoading || !currentProfile || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={180} height={32} borderRadius={10} style={{ marginBottom: 8 }} />
          <Skeleton width={230} height={16} borderRadius={8} />
        </View>
        <View style={styles.tabScrollContainer}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} width={90} height={40} borderRadius={12} style={{ marginStart: 10 }} />)}
        </View>
        <View style={styles.scrollContent}>
          <Skeleton width="100%" height={120} borderRadius={20} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={220} borderRadius={25} style={{ marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', gap: 15 }}>
            <Skeleton width="48%" height={100} borderRadius={20} />
            <Skeleton width="48%" height={100} borderRadius={20} />
          </View>
        </View>
      </SafeAreaView>
    );
  }


  // 🔒 Lead — مقفول بالكامل
  if (!isGuardLoading && userLifecycleState === 'lead') {
    return (
      <LockedTabView
        icon="pulse"
        iconColor="#F97316"
        iconBg="#FFF7ED"
        title="المركز الطبي والقياسات"
        subtitle="اشترك الآن لتبدأ في تسجيل قياساتك الطبية، التحاليل، ونمط حياتك لمتابعة أدق مع طبيبك."
        buttonText="اشترك الآن"
        onPress={() => router.push('/subscriptions')}
      />
    );
  }

  // ⏰ Expired — مقفول بالكامل (إجبار على التجديد)
  if (!isGuardLoading && userLifecycleState === 'expired') {
    return <ExpiredState />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FadeInView delay={100} style={styles.header}>
          <Text style={styles.title}>مركز القياسات <Ionicons name="pulse" size={24} color={AppColors.accent} /></Text>
          <Text style={styles.subtitle}>البيانات الطبية، نمط الحياة، والتحاليل</Text>
        </FadeInView>

        <FadeInView delay={200}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContainer}>
            <AnimatedButton style={[styles.tabBtn, activeTab === 'inbody' && styles.tabBtnActive]} onPress={() => setActiveTab('inbody')}>
              <Ionicons name="body" size={18} color={activeTab === 'inbody' ? AppColors.primary : AppColors.textMuted} />
              <Text style={[styles.tabText, activeTab === 'inbody' && styles.tabTextActive]}>InBody</Text>
            </AnimatedButton>

            <AnimatedButton style={[styles.tabBtn, activeTab === 'docs' && styles.tabBtnActive]} onPress={() => setActiveTab('docs')}>
              <Ionicons name="document-text" size={18} color={activeTab === 'docs' ? AppColors.primary : AppColors.textMuted} />
              <Text style={[styles.tabText, activeTab === 'docs' && styles.tabTextActive]}>التحاليل</Text>
            </AnimatedButton>

            <AnimatedButton style={[styles.tabBtn, activeTab === 'health' && styles.tabBtnActive]} onPress={() => setActiveTab('health')}>
              <Ionicons name="heart-half" size={18} color={activeTab === 'health' ? AppColors.primary : AppColors.textMuted} />
              <Text style={[styles.tabText, activeTab === 'health' && styles.tabTextActive]}>الملف الطبي</Text>
            </AnimatedButton>

            <AnimatedButton style={[styles.tabBtn, activeTab === 'lifestyle' && styles.tabBtnActive]} onPress={() => setActiveTab('lifestyle')}>
              <Ionicons name="cafe" size={18} color={activeTab === 'lifestyle' ? AppColors.primary : AppColors.textMuted} />
              <Text style={[styles.tabText, activeTab === 'lifestyle' && styles.tabTextActive]}>نمط الحياة</Text>
            </AnimatedButton>
          </ScrollView>
        </FadeInView>

        {activeTab === 'inbody' && (
          <FadeInView key="inbody" style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.accent, AppColors.primary]} tintColor={AppColors.primary} />}
          >
            <InBodyTab
              userId={userId!}
              inbodyRecords={inbodyRecords}
              uploading={uploading}
              setUploading={setUploading}
              onRefresh={onRefresh}
            />
          </ScrollView>
          </FadeInView>
        )}

        {activeTab === 'docs' && (
          <FadeInView key="docs" style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.accent, AppColors.primary]} tintColor={AppColors.primary} />}
          >
            <DocumentsTab
              userId={userId!}
              docs={docs}
              uploading={uploading}
              setUploading={setUploading}
              onRefresh={onRefresh}
            />
          </ScrollView>
          </FadeInView>
        )}

        {activeTab === 'health' && (
          <FadeInView key="health" style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.accent, AppColors.primary]} tintColor={AppColors.primary} />}
          >
            <HealthProfileTab
              userId={userId!}
              healthProfile={healthProfile}
              uploading={uploading}
              setUploading={setUploading}
              onRefresh={onRefresh}
            />
          </ScrollView>
          </FadeInView>
        )}

        {activeTab === 'lifestyle' && (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.accent, AppColors.primary]} tintColor={AppColors.primary} />}
          >
            <LifestyleProfileTab
              userId={userId!}
              lifestyleProfile={lifestyleProfile}
              uploading={uploading}
              setUploading={setUploading}
              onRefresh={onRefresh}
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}