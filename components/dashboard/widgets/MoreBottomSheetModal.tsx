import { Text } from '@/components/AppText';
import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppColors } from '../../../constants/AppTheme';
import {
  SupportIcon,
  CalendarIcon,
  ArticleIcon,
  MessageIcon,
  UploadIcon,
  WorkoutIcon,
  SparklesIcon,
  MealIcon,
  PieChartIcon
} from '../../../components/icons';

interface MoreBottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  onLogWaterPress?: () => void;
}

interface SystemToolItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  route?: string;
  action?: 'water';
  highlight?: boolean;
}

export const MoreBottomSheetModal: React.FC<MoreBottomSheetModalProps> = React.memo(({
  visible,
  onClose,
  onLogWaterPress
}) => {
  const router = useRouter();

  const handleItemPress = useCallback((item: SystemToolItem) => {
    onClose();
    if (item.action === 'water' && onLogWaterPress) {
      onLogWaterPress();
    } else if (item.route) {
      router.push(item.route as any);
    }
  }, [onClose, onLogWaterPress, router]);

  const toolsList: SystemToolItem[] = [
    {
      id: 'ai_coach',
      title: 'كوتش هيليكس الذكي',
      subtitle: 'استشارة فورية وتوجيه مخصص',
      icon: <SparklesIcon size={22} color={AppColors.white} />,
      route: '/healix-ai',
      highlight: true
    },
    {
      id: 'contact_doctor',
      title: 'تواصل مع الدكتور',
      subtitle: 'محادثة وتوجيهات طبيبك المباشر',
      icon: <MessageIcon size={22} color={AppColors.primary} />,
      route: '/chat'
    },
    {
      id: 'customer_support',
      title: 'تواصل مع خدمة العملاء',
      subtitle: 'الدعم الفني والمساعدة الفورية',
      icon: <SupportIcon size={22} color={AppColors.primary} />,
      route: '/support'
    },
    {
      id: 'upload_labs',
      title: 'رفع التحاليل والمستندات',
      subtitle: 'إرفاق نتائج المختبر والقياسات',
      icon: <UploadIcon size={22} color={AppColors.primary} />,
      route: '/(tabs)/medical'
    },
    {
      id: 'workouts',
      title: 'التمارين الرياضية',
      subtitle: 'خطة التمرين والجلسات اليومية',
      icon: <WorkoutIcon size={22} color={AppColors.primary} />,
      route: '/(tabs)/workouts'
    },
    {
      id: 'events',
      title: 'الفعاليات والأحداث',
      subtitle: 'الندوات واللقاءات الصحية والمباشرة',
      icon: <CalendarIcon size={22} color={AppColors.primary} />,
      route: '/events'
    },
    {
      id: 'blogs',
      title: 'المدونات والمقالات',
      subtitle: 'مقالات التغذية والعلوم الصحية',
      icon: <ArticleIcon size={22} color={AppColors.primary} />,
      route: '/blog'
    },
    {
      id: 'nutrition_plan',
      title: 'سجل التغذية والوجبات',
      subtitle: 'متابعة الوجبات الموصوفة والمكونات',
      icon: <MealIcon size={22} color={AppColors.primary} />,
      route: '/plans-history'
    },
    {
      id: 'inbody_stats',
      title: 'متابعة قياسات InBody',
      subtitle: 'نسب الدهون والعضلات والكتلة',
      icon: <PieChartIcon size={22} color={AppColors.primary} />,
      route: '/(tabs)/medical'
    }
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalContent}>
          <View style={styles.modalBar} />

          <Text style={styles.modalTitle}>خيارات النظام والأدوات</Text>
          <Text style={styles.modalSub}>إمكانية الوصول السريع لجميع خدمات هيليكس الطبية والتحليلية</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.toolsGrid}
          >
            {toolsList.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.toolCard, item.highlight && styles.toolCardHighlight]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, item.highlight && styles.iconBoxHighlight]}>
                  {item.icon}
                </View>
                <View style={styles.toolTextGroup}>
                  <Text style={[styles.toolTitle, item.highlight && styles.toolTitleHighlight]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.toolSubtitle, item.highlight && styles.toolSubtitleHighlight]} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.modalCloseBtnText}>إغلاق القائمة</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

MoreBottomSheetModal.displayName = 'MoreBottomSheetModal';

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: AppColors.modalOverlay,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: AppColors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingBottom: 34,
    paddingHorizontal: 20,
    maxHeight: '82%',
  },
  modalBar: {
    width: 40,
    height: 4,
    backgroundColor: AppColors.borderSubtle,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'center',
    marginBottom: 4,
    writingDirection: 'rtl',
  },
  modalSub: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    textAlign: 'center',
    marginBottom: 16,
    writingDirection: 'rtl',
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    paddingBottom: 16,
  },
  toolCard: {
    width: '48%',
    backgroundColor: AppColors.surfaceContainerLow,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  toolCardHighlight: {
    backgroundColor: AppColors.accent,
    borderColor: AppColors.accent,
    elevation: 3,
    shadowColor: AppColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: AppColors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  iconBoxHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'transparent',
  },
  toolTextGroup: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  toolTitle: {
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  toolTitleHighlight: {
    color: AppColors.white,
  },
  toolSubtitle: {
    fontSize: 10,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 14,
    writingDirection: 'rtl',
  },
  toolSubtitleHighlight: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  modalCloseBtn: {
    backgroundColor: AppColors.primaryLight,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseBtnText: {
    color: AppColors.primary,
    fontSize: 13,
    fontFamily: 'Thmanyah-Bold',
    writingDirection: 'rtl',
  },
});
