import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppRadius, AppSpacing, AppFontFamily } from '../../constants/AppTheme';
import { AnimatedButton } from '../animations/AnimatedButton';

interface PermissionBottomSheetProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PermissionBottomSheet: React.FC<PermissionBottomSheetProps> = ({
  visible,
  onConfirm,
  onCancel
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Subtle drag indicator */}
          <View style={styles.dragIndicator} />

          {/* Large decorative fitness icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="footsteps" size={40} color="#FFFFFF" />
          </View>

          {/* Title */}
          <Text style={styles.title}>اسمح لـ Healix بمتابعة نشاطك اليومي</Text>
          
          <Text style={styles.subtitle}>
            نحتاج صلاحية الوصول لمستشعرات الحركة لحساب خطواتك وحركتك تلقائياً لمساعدتك على تحقيق أهدافك.
          </Text>

          {/* Benefits bullets */}
          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={20} color={AppColors.success} style={styles.bulletIcon} />
              <Text style={styles.bulletText}>حساب خطواتك ومعدل نشاطك بدقة وسلاسة</Text>
            </View>
            <View style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={20} color={AppColors.success} style={styles.bulletIcon} />
              <Text style={styles.bulletText}>متابعة تقدمك الحركي ومستويات حرق السعرات</Text>
            </View>
            <View style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={20} color={AppColors.success} style={styles.bulletIcon} />
              <Text style={styles.bulletText}>تحسين دقة توجيهات الكوتش الذكي وطبيبك الخاص</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <AnimatedButton 
              style={styles.confirmBtn} 
              onPress={onConfirm}
              activeOpacity={0.9}
            >
              <Text style={styles.confirmText}>السماح بمتابعة النشاط</Text>
            </AnimatedButton>

            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>ليس الآن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: AppSpacing.xxl,
    paddingTop: AppSpacing.md,
    paddingBottom: 45,
    alignItems: 'center',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E5E7EB',
    marginBottom: AppSpacing.lg,
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
    shadowColor: '#2A4B46',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121C2A',
    textAlign: 'center',
    marginBottom: AppSpacing.sm,
    fontFamily: AppFontFamily.bold,
  },
  subtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
    marginBottom: AppSpacing.xl,
    fontFamily: AppFontFamily.regular,
  },
  bulletList: {
    width: '100%',
    gap: AppSpacing.md,
    marginBottom: AppSpacing.xxl,
  },
  bulletRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    paddingRight: 6,
  },
  bulletIcon: {
    marginLeft: 10,
  },
  bulletText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
    textAlign: 'right',
    fontFamily: AppFontFamily.medium,
  },
  actionRow: {
    width: '100%',
    gap: AppSpacing.sm,
  },
  confirmBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#F97316',
    borderRadius: AppRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: AppFontFamily.bold,
  },
  cancelBtn: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    fontFamily: AppFontFamily.medium,
  }
});
