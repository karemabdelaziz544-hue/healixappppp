import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { Text } from '@/components/AppText';
import { AppColors, AppRadius, AppSpacing, AppFontFamily, AppFontSize } from '@/constants/AppTheme';
import { AnimatedButton } from '@/components/animations/AnimatedButton';
import { FadeInView } from '@/components/animations/FadeInView';
import { SkeletonLoader } from '@/components/animations/SkeletonLoader';
import { showToast } from '@/components/AppToast';
import { useAuth } from '@/src/context/AuthContext';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const CATEGORIES = ['الكل', 'ورشة عمل', 'مؤتمر طبي', 'لقاء مفتوح'];

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

interface BookingType {
  id: string;
  event_id: string;
  user_id: string;
  status: string | null;
  payment_proof: string | null;
  attended: boolean | null;
  created_at: string;
  event: EventType;
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

// ─── Animation Wrapper for Cards ─────────────────────────────
const PressableCard: React.FC<{ onPress: () => void; children: React.ReactNode; style?: any }> = ({
  onPress,
  children,
  style,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style]}
    >
      <Animated.View style={[styles.cardContainer, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function EventsListScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const user = session?.user;

  const [activeTab, setActiveTab] = useState<'available' | 'my_events'>('available');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [events, setEvents] = useState<EventType[]>([]);
  const [myBookings, setMyBookings] = useState<BookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Fetch visible events
      const { data: evData, error: evErr } = await supabase
        .from('events')
        .select('id, title, subtitle, image_url, event_date, location, points_reward, max_attendees, is_visible')
        .eq('is_visible', true)
        .order('event_date', { ascending: true })
        .limit(50);

      if (evErr) throw evErr;
      setEvents((evData || []) as any);

      if (user) {
        // Fetch user bookings
        const { data: bkData, error: bkErr } = await supabase
          .from('event_bookings')
          .select('id, event_id, status, created_at, event:events(id, title, event_date, location, image_url)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (bkErr) throw bkErr;
        setMyBookings((bkData || []) as any);
      }
    } catch (err: any) {
      showToast.error('حدث خطأ أثناء تحميل الفعاليات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [user]);

  // Filter available events (exclude ones already booked by the user)
  const bookedEventIds = myBookings.map((b) => b.event_id);
  
  const filteredEvents = events.filter((ev) => {
    const isAvailable = !bookedEventIds.includes(ev.id);
    const matchesCategory =
      selectedCategory === 'الكل' || (ev.category || 'ورشة عمل') === selectedCategory;
    return isAvailable && matchesCategory;
  });

  const featuredEvent = filteredEvents[0];
  const upcomingEvents = filteredEvents.slice(1);

  // ─── Render Components ────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color={AppColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.titleText}>الفعاليات واللقاءات</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.subtitleText}>
        شارك معنا في اللقاءات والورش الصحية التي يقدمها فريق Healix.
      </Text>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'available' && styles.tabActive]}
        onPress={() => setActiveTab('available')}
      >
        <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
          الفعاليات المتاحة
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'my_events' && styles.tabActive]}
        onPress={() => setActiveTab('my_events')}
      >
        <Text style={[styles.tabText, activeTab === 'my_events' && styles.tabTextActive]}>
          فعالياتي
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCategories = () => {
    if (activeTab !== 'available') return null;
    return (
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <SkeletonLoader height={200} borderRadius={AppRadius.lg} />
      <View style={styles.skeletonMeta}>
        <SkeletonLoader width={80} height={16} />
        <SkeletonLoader width={100} height={16} />
      </View>
      <SkeletonLoader width="90%" height={24} style={{ marginTop: AppSpacing.sm }} />
      <SkeletonLoader width="70%" height={16} style={{ marginTop: AppSpacing.xs }} />
    </View>
  );

  const renderFeatured = () => {
    if (!featuredEvent) return null;
    return (
      <FadeInView delay={100} style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>الفعالية المميزة</Text>
        <PressableCard
          onPress={() => router.push(`/events/${featuredEvent.id}`)}
          style={styles.featuredCard}
        >
          <Image
            source={{ uri: featuredEvent.image_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80' }}
            style={styles.featuredImage}
          />
          <View style={styles.featuredContent}>
            <View style={styles.metaRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{featuredEvent.category || 'ورشة عمل'}</Text>
              </View>
              <Text style={styles.metaText}>{featuredEvent.duration || '4 ساعات'}</Text>
            </View>
            <Text style={styles.featuredTitle}>{featuredEvent.title}</Text>
            <View style={styles.detailsRow}>
              <Ionicons name="calendar-outline" size={14} color={AppColors.textSecondary} />
              <Text style={styles.detailsText}>{formatDate(featuredEvent.event_date)}</Text>
              <Ionicons name="time-outline" size={14} color={AppColors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={styles.detailsText}>{formatTime(featuredEvent.event_date)}</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.priceText}>
                {featuredEvent.price && featuredEvent.price > 0 ? `${featuredEvent.price} جنيه` : 'مجاناً'}
              </Text>
              <View style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>التفاصيل والحجز</Text>
                <Ionicons name="arrow-back" size={16} color={AppColors.primary} />
              </View>
            </View>
          </View>
        </PressableCard>
      </FadeInView>
    );
  };

  const renderUpcomingList = () => {
    if (upcomingEvents.length === 0) return null;
    return (
      <FadeInView delay={200} style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>الفعاليات القادمة</Text>
        {upcomingEvents.map((ev) => (
          <PressableCard
            key={ev.id}
            onPress={() => router.push(`/events/${ev.id}`)}
            style={styles.eventCard}
          >
            <View style={styles.eventCardContent}>
              <Image
                source={{ uri: ev.image_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80' }}
                style={styles.eventCardImage}
              />
              <View style={styles.eventCardDetails}>
                <Text style={styles.eventCardCategory}>{ev.category || 'ورشة عمل'}</Text>
                <Text style={styles.eventCardTitle} numberOfLines={2}>
                  {ev.title}
                </Text>
                <Text style={styles.eventCardDate}>{formatDate(ev.event_date)}</Text>
                <View style={styles.eventCardFooter}>
                  <Text style={styles.priceText}>
                    {ev.price && ev.price > 0 ? `${ev.price} جنيه` : 'مجاناً'}
                  </Text>
                  <Text style={styles.locationText}>{ev.location || 'حضوري في مقر هيلكس'}</Text>
                </View>
              </View>
            </View>
          </PressableCard>
        ))}
      </FadeInView>
    );
  };

  const renderMyBookings = () => {
    if (myBookings.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={AppColors.textMuted} />
          <Text style={styles.emptyTitle}>لم تقم بحجز أي فعاليات بعد</Text>
          <Text style={styles.emptySubtitle}>استعرض الفعاليات المتاحة وسجل لحضور الورش والمؤتمرات.</Text>
        </View>
      );
    }

    return (
      <FadeInView delay={100} style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>حجوزاتي</Text>
        {myBookings.map((booking) => {
          const ev = booking.event;
          if (!ev) return null;
          
          let statusText = 'قيد المراجعة';
          let statusColor = '#EAB308'; // yellow
          let statusBg = '#FEF9C3';

          if (booking.status === 'confirmed') {
            statusText = 'تم قبول الحجز';
            statusColor = '#10B981'; // green
            statusBg = '#D1FAE5';
          } else if (booking.status === 'rejected') {
            statusText = 'مرفوض';
            statusColor = '#EF4444'; // red
            statusBg = '#FEE2E2';
          }

          return (
            <PressableCard
              key={booking.id}
              onPress={() => router.push(`/events/${ev.id}`)}
              style={styles.myEventCard}
            >
              <View style={styles.eventCardContent}>
                <Image
                  source={{ uri: ev.image_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80' }}
                  style={styles.eventCardImage}
                />
                <View style={styles.eventCardDetails}>
                  <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
                  </View>
                  <Text style={styles.eventCardTitle} numberOfLines={2}>
                    {ev.title}
                  </Text>
                  <Text style={styles.eventCardDate}>{formatDate(ev.event_date)}</Text>
                  {booking.status === 'confirmed' && (
                    <TouchableOpacity
                      style={styles.ticketBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(`/events/ticket?id=${booking.id}`);
                      }}
                    >
                      <Ionicons name="qr-code-outline" size={14} color="#FFF" />
                      <Text style={styles.ticketBtnText}>عرض التذكرة</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </PressableCard>
          );
        })}
      </FadeInView>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color={AppColors.textMuted} />
      <Text style={styles.emptyTitle}>لا توجد فعاليات متاحة</Text>
      <Text style={styles.emptySubtitle}>جرب تغيير خيار التصفية للحصول على المزيد من الورش.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {renderHeader()}
      {renderTabs()}
      {renderCategories()}

      {loading ? (
        renderSkeleton()
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.primary]} />
          }
        >
          {activeTab === 'available' ? (
            filteredEvents.length === 0 ? (
              renderEmptyState()
            ) : (
              <>
                {renderFeatured()}
                {renderUpcomingList()}
              </>
            )
          ) : (
            renderMyBookings()
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F8F3', // Warm background
  },
  headerContainer: {
    paddingHorizontal: AppSpacing.xxl,
    paddingTop: AppSpacing.md,
    paddingBottom: AppSpacing.sm,
    backgroundColor: '#F9F8F3',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  backButton: {
    padding: AppSpacing.xs,
  },
  titleText: {
    fontFamily: AppFontFamily.extraBold,
    fontSize: AppFontSize.xxl + 2,
    color: AppColors.primary,
  },
  subtitleText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.sm + 1,
    color: AppColors.textSecondary,
    textAlign: 'left',
    marginTop: AppSpacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: AppRadius.lg,
    padding: 4,
    marginHorizontal: AppSpacing.xxl,
    marginBottom: AppSpacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: AppSpacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: AppRadius.md,
  },
  tabActive: {
    backgroundColor: AppColors.primary,
  },
  tabText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm,
    color: AppColors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  categoriesContainer: {
    marginBottom: AppSpacing.md,
  },
  categoriesContent: {
    paddingHorizontal: AppSpacing.xxl,
    gap: AppSpacing.sm,
  },
  categoryChip: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.xs + 2,
    borderRadius: AppRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  categoryText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm,
    color: AppColors.textSecondary,
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionContainer: {
    paddingHorizontal: AppSpacing.xxl,
    marginBottom: AppSpacing.xl,
  },
  sectionTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.textPrimary,
    textAlign: 'left',
    marginBottom: AppSpacing.md,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.xl,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    overflow: 'hidden',
  },
  featuredCard: {
    width: '100%',
  },
  featuredImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  featuredContent: {
    padding: AppSpacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: AppSpacing.sm + 2,
    paddingVertical: 2,
    borderRadius: AppRadius.sm,
    backgroundColor: AppColors.primaryLight,
  },
  categoryBadgeText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: AppColors.primary,
  },
  metaText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs + 1,
    color: AppColors.textSecondary,
  },
  featuredTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.textPrimary,
    textAlign: 'left',
    marginBottom: AppSpacing.xs,
    lineHeight: 24,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
    gap: 4,
  },
  detailsText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs + 1,
    color: AppColors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: AppSpacing.md,
  },
  priceText: {
    fontFamily: AppFontFamily.extraBold,
    fontSize: AppFontSize.md + 1,
    color: AppColors.primary,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm,
    color: AppColors.primary,
  },
  eventCard: {
    marginBottom: AppSpacing.md,
  },
  myEventCard: {
    marginBottom: AppSpacing.md,
  },
  eventCardContent: {
    flexDirection: 'row',
    padding: AppSpacing.md,
    gap: AppSpacing.md,
  },
  eventCardImage: {
    width: 100,
    height: 100,
    borderRadius: AppRadius.md,
    resizeMode: 'cover',
  },
  eventCardDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  eventCardCategory: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: AppColors.primary,
    textAlign: 'left',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
    borderRadius: AppRadius.sm,
  },
  statusBadgeText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs - 1,
  },
  eventCardTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md,
    color: AppColors.textPrimary,
    textAlign: 'left',
    lineHeight: 20,
  },
  eventCardDate: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textAlign: 'left',
  },
  eventCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationText: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs,
    color: AppColors.textSecondary,
  },
  ticketBtn: {
    backgroundColor: AppColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.xs,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppRadius.sm,
    marginTop: AppSpacing.xs,
  },
  ticketBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: '#FFFFFF',
  },
  skeletonContainer: {
    paddingHorizontal: AppSpacing.xxl,
    gap: AppSpacing.lg,
  },
  skeletonMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: AppSpacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.xxxl,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.textPrimary,
    marginTop: AppSpacing.md,
  },
  emptySubtitle: {
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.sm,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: AppSpacing.xs,
    lineHeight: 20,
  },
});
