import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { Text } from '@/components/AppText';
import { AppColors, AppRadius, AppSpacing, AppFontFamily, AppFontSize } from '@/constants/AppTheme';
import { AnimatedButton } from '@/components/animations/AnimatedButton';
import { FadeInView } from '@/components/animations/FadeInView';
import { showToast } from '@/components/AppToast';
import { useAuth } from '@/src/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface EventType {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  max_capacity: number | null;
  price: number | null;
  image_url: string | null;
  category: string | null;
  duration: string | null;
  registration_deadline: string | null;
  speakers: any;
  created_at: string;
}

interface SpeakerType {
  name: string;
  role: string;
  avatar_url?: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const rawDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      const monthsAr = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      return `${day} ${monthsAr[month - 1]} ${year}`;
    }
    return rawDate;
  } catch {
    return '';
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const timePart = dateStr.includes('T') ? dateStr.split('T')[1] : dateStr;
    const cleanTime = timePart.split('+')[0].split('Z')[0];
    const parts = cleanTime.split(':');
    if (parts.length >= 2) {
      let hour = parseInt(parts[0], 10);
      const minute = parts[1];
      const ampm = hour >= 12 ? 'م' : 'ص';
      hour = hour % 12;
      hour = hour ? hour : 12;
      return `${hour}:${minute} ${ampm}`;
    }
    return '';
  } catch {
    return '';
  }
}

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const user = session?.user;
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState<EventType | null>(null);
  const [booking, setBooking] = useState<any | null>(null);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'speakers'>('about');

  useEffect(() => {
    const loadEventDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // 1. Fetch Event info
        const { data: evData, error: evErr } = await supabase
          .from('events')
          .select('id, title, subtitle, description, event_date, location, points_reward, price, max_attendees, image_url, speakers, agenda')
          .eq('id', id)
          .maybeSingle();

        if (evErr) throw evErr;
        setEvent(evData as any);

        // 2. Fetch User booking status for this event
        if (user) {
          const { data: bkData } = await supabase
            .from('event_bookings')
            .select('id, status, created_at')
            .eq('event_id', id)
            .eq('user_id', user.id)
            .maybeSingle();
          setBooking(bkData);
        }

        // 3. Fetch count of confirmed bookings for capacity calculation
        const { count, error: countErr } = await supabase
          .from('event_bookings')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', id)
          .eq('status', 'confirmed');

        setTotalBookingsCount(count || 0);
      } catch (err: any) {
        showToast.error('خطأ في تحميل تفاصيل الفعالية');
      } finally {
        setLoading(false);
      }
    };

    loadEventDetails();
  }, [id, user]);

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        title: event.title,
        message: `${event.title}\n\nموعدنا: ${formatDate(event.event_date)} في ${event.location || 'مقر هيلكس'}\n\nسجل الآن عبر تطبيق Healix!`,
      });
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={AppColors.danger} />
        <Text style={styles.errorText}>الفعالية غير موجودة</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>رجوع للفعاليات</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const maxCapacity = event.max_capacity || 50;
  const seatsLeft = Math.max(0, maxCapacity - totalBookingsCount);
  const isFull = seatsLeft <= 0;

  // Extract speakers from JSON
  let speakersList: SpeakerType[] = [];
  try {
    if (event.speakers) {
      speakersList = typeof event.speakers === 'string' ? JSON.parse(event.speakers) : event.speakers;
    }
  } catch {
    // ignore
  }

  // Fallback default speakers if none specified to make UI look rich
  if (speakersList.length === 0) {
    speakersList = [
      { name: 'د. أحمد سالم', role: 'مستشار التغذية العلاجية وإدارة الوزن', avatar_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&q=80' },
      { name: 'د. ليلى عثمان', role: 'أخصائية التغذية العلاجية للأطفال والرياضيين', avatar_url: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?w=150&q=80' }
    ];
  }

  // Render bottom registration action based on booking status
  const renderBottomBar = () => {
    let buttonText = 'احجز مقعدك الآن';
    let isDisabled = false;
    let onPressAction = () => router.push(`/events/book?id=${event.id}`);

    if (booking) {
      if (booking.status === 'confirmed') {
        buttonText = 'عرض التذكرة';
        onPressAction = () => router.push(`/events/ticket?id=${booking.id}`);
      } else if (booking.status === 'pending') {
        buttonText = 'حجزك قيد المراجعة ⏳';
        isDisabled = true;
      } else if (booking.status === 'rejected') {
        buttonText = 'إعادة تقديم طلب الحجز';
        onPressAction = () => router.push(`/events/book?id=${event.id}`);
      }
    } else if (isFull) {
      buttonText = 'عذراً، اكتمل العدد';
      isDisabled = true;
    }

    return (
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <AnimatedButton
          style={[styles.stickyActionBtn, isDisabled && styles.stickyActionBtnDisabled]}
          onPress={onPressAction}
          disabled={isDisabled}
        >
          <Text style={styles.stickyActionBtnText}>{buttonText}</Text>
        </AnimatedButton>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Floating Header */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + AppSpacing.sm }]}>
        <TouchableOpacity style={styles.floatingBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cover Section */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: event.image_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=85' }}
            style={styles.coverImage}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
            style={styles.gradientOverlay}
          />
          <View style={styles.coverDetails}>
            <View style={styles.coverMetaRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{event.category || 'مؤتمر طبي'}</Text>
              </View>
              <Text style={styles.coverMetaText}>{event.duration || '4 ساعات'}</Text>
            </View>
            <Text style={styles.title}>{event.title}</Text>
            
            <View style={styles.metaGrid}>
              <View style={styles.metaGridItem}>
                <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaGridText}>{formatDate(event.event_date)}</Text>
              </View>
              <View style={styles.metaGridItem}>
                <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaGridText}>{formatTime(event.event_date)}</Text>
              </View>
              <View style={styles.metaGridItem}>
                <Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaGridText}>متبقي {seatsLeft} مقعداً</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs switcher */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.tabActive]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>عن الفعالية</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'speakers' && styles.tabActive]}
            onPress={() => setActiveTab('speakers')}
          >
            <Text style={[styles.tabText, activeTab === 'speakers' && styles.tabTextActive]}>المتحدثين</Text>
          </TouchableOpacity>
        </View>

        {/* Content body */}
        <View style={styles.contentBody}>
          {activeTab === 'about' ? (
            <FadeInView style={styles.tabContent}>
              <Text style={styles.aboutText}>
                {event.description || 'لم يتم إضافة تفاصيل لهذه الفعالية بعد.'}
              </Text>
              
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={20} color={AppColors.primary} />
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoLabel}>الموقع الجغرافي</Text>
                    <Text style={styles.infoValue}>{event.location || 'حضوري في مقر هيلكس'}</Text>
                  </View>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Ionicons name="wallet-outline" size={20} color={AppColors.primary} />
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoLabel}>سعر التذكرة</Text>
                    <Text style={styles.infoValue}>
                      {event.price && event.price > 0 ? `${event.price} جنيه مصري` : 'مجاني بالكامل'}
                    </Text>
                  </View>
                </View>
              </View>
            </FadeInView>
          ) : (
            <FadeInView style={styles.tabContent}>
              {speakersList.map((speaker, idx) => (
                <View key={idx} style={styles.speakerCard}>
                  <Image
                    source={{ uri: speaker.avatar_url || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&q=80' }}
                    style={styles.speakerAvatar}
                  />
                  <View style={styles.speakerInfo}>
                    <Text style={styles.speakerName}>{speaker.name}</Text>
                    <Text style={styles.speakerRole}>{speaker.role}</Text>
                  </View>
                </View>
              ))}
            </FadeInView>
          )}
        </View>
      </ScrollView>

      {renderBottomBar()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F8F3', // Warm background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F8F3',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AppSpacing.xxl,
    backgroundColor: '#F9F8F3',
  },
  errorText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.textPrimary,
    marginVertical: AppSpacing.md,
  },
  backBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.full,
  },
  backBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md,
    color: '#FFFFFF',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  coverContainer: {
    width: '100%',
    height: 380,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
  },
  coverDetails: {
    position: 'absolute',
    bottom: AppSpacing.xl,
    left: AppSpacing.xl,
    right: AppSpacing.xl,
  },
  coverMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.md,
  },
  badge: {
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
    borderRadius: AppRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: '#FFFFFF',
  },
  coverMetaText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs + 1,
    color: 'rgba(255,255,255,0.85)',
  },
  title: {
    fontFamily: AppFontFamily.extraBold,
    fontSize: AppFontSize.xxl + 2,
    color: '#FFFFFF',
    textAlign: 'left',
    lineHeight: 34,
    marginBottom: AppSpacing.md,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.md,
  },
  metaGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaGridText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs + 1,
    color: 'rgba(255,255,255,0.9)',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: AppSpacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: AppColors.primary,
  },
  tabText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm + 1,
    color: AppColors.textSecondary,
  },
  tabTextActive: {
    color: AppColors.primary,
  },
  contentBody: {
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.xl,
  },
  tabContent: {
    gap: AppSpacing.md,
  },
  aboutText: {
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.md,
    color: AppColors.textPrimary,
    lineHeight: 26,
    textAlign: 'left',
    marginBottom: AppSpacing.md,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textAlign: 'left',
  },
  infoValue: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm + 1,
    color: AppColors.textPrimary,
    textAlign: 'left',
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  speakerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: AppSpacing.md,
    gap: AppSpacing.md,
  },
  speakerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
  },
  speakerInfo: {
    flex: 1,
  },
  speakerName: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md,
    color: AppColors.textPrimary,
    textAlign: 'left',
  },
  speakerRole: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs + 1,
    color: AppColors.textSecondary,
    textAlign: 'left',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: AppSpacing.sm + 2,
    paddingHorizontal: AppSpacing.xl,
  },
  stickyActionBtn: {
    backgroundColor: AppColors.primary,
    height: 50,
    borderRadius: AppRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  stickyActionBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  stickyActionBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md,
    color: '#FFFFFF',
  },
});
