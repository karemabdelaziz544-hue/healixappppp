import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { Text } from '@/components/AppText';
import { AppColors, AppRadius, AppSpacing, AppFontFamily, AppFontSize } from '@/constants/AppTheme';
import { AnimatedButton } from '@/components/animations/AnimatedButton';
import { FadeInView } from '@/components/animations/FadeInView';
import { showToast } from '@/components/AppToast';

const { width } = Dimensions.get('window');

interface EventType {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  category: string | null;
  image_url: string | null;
}

interface BookingType {
  id: string;
  event_id: string;
  user_id: string;
  status: string | null;
  created_at: string;
  event: EventType;
  user_name?: string;
}

function formatDateWithWeekday(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const rawDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
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

export default function EventTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('event_bookings')
          .select('*, event:events(*)')
          .eq('id', id)
          .single();

        if (error) throw error;

        // Fetch user's full name to render on ticket
        const { data: profData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.user_id)
          .single();

        setBooking({
          ...data,
          user_name: profData?.full_name || 'مشترك هيلكس',
        });
      } catch (err: any) {
        showToast.error('فشل تحميل بيانات التذكرة');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchBookingDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (!booking || !booking.event) return null;

  const ev = booking.event;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${booking.id}&color=004532&bgcolor=ffffff`;

  const formattedDate = formatDateWithWeekday(ev.event_date);
  const formattedTime = formatTime(ev.event_date);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/events')}>
          <Ionicons name="arrow-forward" size={24} color={AppColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تذكرتي</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <FadeInView delay={100} style={styles.ticketWrapper}>
          {/* Ticket Container */}
          <View style={styles.ticketCard}>
            {/* Top Image Section */}
            <Image
              source={{ uri: ev.image_url || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80' }}
              style={styles.ticketImage}
            />

            {/* Ticket Cutouts */}
            <View style={styles.cutoutRow}>
              <View style={styles.leftCutout} />
              <View style={styles.rightCutout} />
            </View>

            {/* Content Section */}
            <View style={styles.ticketContent}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{ev.category || 'ورشة عمل'}</Text>
              </View>
              
              <Text style={styles.eventTitle}>{ev.title}</Text>

              <View style={styles.infoGrid}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>التاريخ</Text>
                  <Text style={styles.infoValue}>{formattedDate}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>الوقت</Text>
                  <Text style={styles.infoValue}>{formattedTime}</Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>الموقع</Text>
                  <Text style={styles.infoValue}>{ev.location || 'مقر هيلكس'}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>الاسم</Text>
                  <Text style={styles.infoValue}>{booking.user_name}</Text>
                </View>
              </View>

              {/* Dash Divider */}
              <View style={styles.dashLine} />

              {/* QR Code Section */}
              <View style={styles.qrContainer}>
                <Text style={styles.qrTitle}>رمز الدخول السريع</Text>
                <Text style={styles.qrSubtitle}>امسح الرمز عند بوابة الدخول للتحقق من التذكرة</Text>
                
                <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} />
                
                <Text style={styles.ticketId}>رقم التذكرة: {booking.id.substring(0, 8).toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        <AnimatedButton style={styles.doneBtn} onPress={() => router.replace('/events')}>
          <Text style={styles.doneBtnText}>العودة للفعاليات</Text>
        </AnimatedButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F8F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F8F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: AppSpacing.xs,
  },
  headerTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.lg,
    color: AppColors.primary,
  },
  scrollContent: {
    padding: AppSpacing.xl,
    alignItems: 'center',
    paddingBottom: 60,
  },
  ticketWrapper: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 25,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ticketImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  cutoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 24,
    marginTop: -12,
    zIndex: 10,
  },
  leftCutout: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F9F8F3',
    marginLeft: -12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  rightCutout: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F9F8F3',
    marginRight: -12,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  ticketContent: {
    padding: AppSpacing.lg,
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
    borderRadius: AppRadius.sm,
    backgroundColor: AppColors.primaryLight,
    marginBottom: AppSpacing.sm,
    alignSelf: 'center',
  },
  categoryBadgeText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: AppColors.primary,
  },
  eventTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md + 1,
    color: AppColors.textPrimary,
    textAlign: 'center',
    marginBottom: AppSpacing.md,
    lineHeight: 22,
  },
  infoGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: AppSpacing.md,
    gap: AppSpacing.lg,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: AppFontFamily.medium,
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  dashLine: {
    width: '100%',
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginVertical: AppSpacing.md,
  },
  qrContainer: {
    alignItems: 'center',
    width: '100%',
  },
  qrTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.sm + 1,
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  qrSubtitle: {
    fontFamily: AppFontFamily.regular,
    fontSize: AppFontSize.xs,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: AppSpacing.md,
  },
  qrImage: {
    width: 160,
    height: 160,
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
    borderRadius: AppRadius.md,
  },
  ticketId: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    marginTop: AppSpacing.md,
  },
  doneBtn: {
    backgroundColor: AppColors.primary,
    height: 50,
    borderRadius: AppRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    marginTop: AppSpacing.xl,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  doneBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: AppFontSize.md,
    color: '#FFFFFF',
  },
});
