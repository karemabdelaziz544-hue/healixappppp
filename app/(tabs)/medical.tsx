import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useFamily } from '../../src/context/FamilyContext';
import { useSubscriptionGuard } from '../../hooks/useSubscriptionGuard';
import Skeleton from '../../components/Skeleton';
import LockedTabView from '../../components/LockedTabView';
import type { InbodyRecord, ClientDocument, HealthProfile, LifestyleProfile } from '../../src/types';

import { medicalStyles as styles } from '../../src/features/medical/medicalStyles';
import InBodyTab from '../../src/features/medical/InBodyTab';
import DocumentsTab from '../../src/features/medical/DocumentsTab';
import HealthProfileTab from '../../src/features/medical/HealthProfileTab';
import LifestyleProfileTab from '../../src/features/medical/LifestyleProfileTab';
import { useRouter } from 'expo-router';

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

  const fetchAllData = useCallback(async () => {
    if (!userId) return;
    try {
      await Promise.all([fetchInbody(), fetchDocs(), fetchProfiles()]);
    } catch (error) {
      console.log('Error fetching all medical data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      fetchAllData();
    }
  }, [fetchAllData, userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  const fetchProfiles = async () => {
    const { data: health } = await supabase.from('health_profile').select('*').eq('user_id', userId).single();
    setHealthProfile(health || null);

    const { data: life } = await supabase.from('lifestyle_profile').select('*').eq('user_id', userId).single();
    setLifestyleProfile(life || null);
  };

  const fetchInbody = async () => {
    const { data } = await supabase.from('inbody_records').select('*').eq('user_id', userId).order('record_date', { ascending: true });
    setInbodyRecords(data || []);
  };

  const fetchDocs = async () => {
    const { data } = await supabase.from('client_documents').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setDocs(data || []);
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
          {[1, 2, 3, 4].map(i => <Skeleton key={i} width={90} height={40} borderRadius={12} style={{ marginLeft: 10 }} />)}
        </View>
        <View style={styles.scrollContent}>
          <Skeleton width="100%" height={120} borderRadius={20} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={220} borderRadius={25} style={{ marginBottom: 20 }} />
          <View style={{ flexDirection: 'row-reverse', gap: 15 }}>
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
        title="المركز الطبي والقياسات 🩺"
        subtitle="اشترك الآن لتبدأ في تسجيل قياساتك الطبية، التحاليل، ونمط حياتك لمتابعة أدق مع طبيبك."
        buttonText="اشترك الآن"
        onPress={() => router.push('/subscriptions')}
      />
    );
  }

  // ⏰ Expired — مقفول بالكامل (إجبار على التجديد)
  if (!isGuardLoading && userLifecycleState === 'expired') {
    const ExpiredState = require('../../components/ExpiredState').default;
    return <ExpiredState />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>مركز القياسات <Ionicons name="pulse" size={24} color="#F97316" /></Text>
          <Text style={styles.subtitle}>البيانات الطبية، نمط الحياة، والتحاليل</Text>
        </View>

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContainer}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'inbody' && styles.tabBtnActive]} onPress={() => setActiveTab('inbody')}>
              <Ionicons name="body" size={18} color={activeTab === 'inbody' ? "#2A4B46" : "#9CA3AF"} />
              <Text style={[styles.tabText, activeTab === 'inbody' && styles.tabTextActive]}>InBody</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.tabBtn, activeTab === 'docs' && styles.tabBtnActive]} onPress={() => setActiveTab('docs')}>
              <Ionicons name="document-text" size={18} color={activeTab === 'docs' ? "#2A4B46" : "#9CA3AF"} />
              <Text style={[styles.tabText, activeTab === 'docs' && styles.tabTextActive]}>التحاليل</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.tabBtn, activeTab === 'health' && styles.tabBtnActive]} onPress={() => setActiveTab('health')}>
              <Ionicons name="heart-half" size={18} color={activeTab === 'health' ? "#2A4B46" : "#9CA3AF"} />
              <Text style={[styles.tabText, activeTab === 'health' && styles.tabTextActive]}>الملف الطبي</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.tabBtn, activeTab === 'lifestyle' && styles.tabBtnActive]} onPress={() => setActiveTab('lifestyle')}>
              <Ionicons name="cafe" size={18} color={activeTab === 'lifestyle' ? "#2A4B46" : "#9CA3AF"} />
              <Text style={[styles.tabText, activeTab === 'lifestyle' && styles.tabTextActive]}>نمط الحياة</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316', '#2A4B46']} tintColor="#2A4B46" />}
        >
          {activeTab === 'inbody' && (
            <InBodyTab
              userId={userId!}
              inbodyRecords={inbodyRecords}
              uploading={uploading}
              setUploading={setUploading}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'docs' && (
            <DocumentsTab
              userId={userId!}
              docs={docs}
              uploading={uploading}
              setUploading={setUploading}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'health' && (
            <HealthProfileTab
              userId={userId!}
              healthProfile={healthProfile}
              uploading={uploading}
              setUploading={setUploading}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'lifestyle' && (
            <LifestyleProfileTab
              userId={userId!}
              lifestyleProfile={lifestyleProfile}
              uploading={uploading}
              setUploading={setUploading}
              onRefresh={onRefresh}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}