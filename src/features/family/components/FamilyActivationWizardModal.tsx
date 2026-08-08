import { Text } from '@/components/AppText';
import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppRadius, AppFontFamily } from '../../../../constants/AppTheme';
import { FadeInView } from '../../../../components/animations/FadeInView';
import { AnimatedButton } from '../../../../components/animations/AnimatedButton';
import type { Profile } from '../../../types';
import { showToast } from '../../../../components/AppToast';
import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';

interface FamilyActivationWizardModalProps {
  visible: boolean;
  onClose: () => void;
  familyMembers: Profile[];
  purchasedLicenses: number;
  onRefresh: () => Promise<void>;
}

export const FamilyActivationWizardModal: React.FC<FamilyActivationWizardModalProps> = ({
  visible,
  onClose,
  familyMembers,
  purchasedLicenses,
  onRefresh,
}) => {
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  const childMembers = familyMembers.filter(m => !!m.manager_id);
  const activeCount = childMembers.filter(m => m.subscription_status === 'active').length;
  const remainingSlots = Math.max(0, purchasedLicenses - activeCount);

  const handleToggleActivation = async (member: Profile) => {
    const isCurrentlyActive = member.subscription_status === 'active';

    if (!isCurrentlyActive && remainingSlots <= 0) {
      showToast.info(`لقد استنفدت جميع التراخيص المتاحة (${purchasedLicenses} ترخيص). يمكنك زيادة التراخيص من صفحة الاشتراك.`);
      return;
    }

    setLoadingMemberId(member.id);
    try {
      const newStatus = isCurrentlyActive ? 'pending_activation' : 'active';
      const { error } = await executeQuery(
        supabase
          .from('profiles')
          .update({ subscription_status: newStatus })
          .eq('id', member.id)
      );

      if (error) throw error;

      showToast.success(
        isCurrentlyActive
          ? `تم إلغاء تفعيل حساب ${member.full_name || 'الفرد'}`
          : `🔓 تم تفعيل حساب ${member.full_name || 'الفرد'} بنجاح!`
      );

      await onRefresh();
    } catch (err) {
      showToast.error('فشل تغيير حالة التفعيل. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoadingMemberId(null);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <FadeInView style={styles.modalCard}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color="#6B7280" />
            </TouchableOpacity>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>تفعيل حسابات العائلة 👨‍👩‍👧</Text>
              <Text style={styles.subtitle}>اختر الأفراد المراد تفعيلهم حسب رخصك المتاحة</Text>
            </View>
          </View>

          {/* Quota Indicator */}
          <View style={styles.quotaBadge}>
            <Ionicons name="key" size={16} color="#D97706" />
            <Text style={styles.quotaBadgeText}>
              التراخيص المفعّلة: {activeCount} من أصل {purchasedLicenses} Mapped 🟢 (المتبقي: {remainingSlots})
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.memberList} showsVerticalScrollIndicator={false}>
            {childMembers.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="people-outline" size={40} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>لم تقم بإنشاء أفراد عائلة بعد</Text>
                <Text style={styles.emptySub}>يمكنك إضافة أفراد عائلتك ثم تفعيلهم من هذه الشاشة.</Text>
              </View>
            ) : (
              childMembers.map((member) => {
                const isActive = member.subscription_status === 'active';
                const isBusy = loadingMemberId === member.id;

                return (
                  <View key={member.id} style={[styles.memberRow, isActive && styles.memberRowActive]}>
                    <View style={styles.memberAvatarCircle}>
                      {member.avatar_url ? (
                        <Image source={{ uri: member.avatar_url }} style={styles.memberAvatarImg} />
                      ) : (
                        <Ionicons name="person" size={22} color={isActive ? '#059669' : '#6B7280'} />
                      )}
                    </View>

                    <View style={styles.memberInfoCol}>
                      <Text style={styles.memberName}>{member.full_name || 'بدون اسم'}</Text>
                      <Text style={styles.memberSubText}>
                        {member.gender === 'male' ? 'ذكر' : 'أنثى'} • {member.weight || '-'} كجم
                      </Text>
                      <View style={[styles.statusPill, isActive ? styles.statusPillActive : styles.statusPillPending]}>
                        <Text style={[styles.statusPillText, isActive ? styles.statusPillTextActive : styles.statusPillTextPending]}>
                          {isActive ? '🟢 مفّعل (Active)' : '🔒 غير مفّعل (Pending)'}
                        </Text>
                      </View>
                    </View>

                    <AnimatedButton
                      style={[styles.toggleBtn, isActive ? styles.toggleBtnDeactive : styles.toggleBtnActive]}
                      onPress={() => handleToggleActivation(member)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.toggleBtnText}>{isActive ? 'إلغاء التفعيل' : 'تفعيل الآن 🔓'}</Text>
                      )}
                    </AnimatedButton>
                  </View>
                );
              })
            )}
          </ScrollView>

          <AnimatedButton style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>حفظ وإغلاق</Text>
          </AnimatedButton>
        </FadeInView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: AppRadius.xl,
    borderTopRightRadius: AppRadius.xl,
    padding: 20,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleWrap: {
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: AppFontFamily.bold,
    fontSize: 18,
    color: '#111827',
  },
  subtitle: {
    fontFamily: AppFontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  quotaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  quotaBadgeText: {
    fontFamily: AppFontFamily.bold,
    fontSize: 12,
    color: '#92400E',
  },
  memberList: {
    gap: 10,
    paddingBottom: 20,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: AppFontFamily.bold,
    fontSize: 14,
    color: '#374151',
  },
  emptySub: {
    fontFamily: AppFontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  memberRowActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  memberAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  memberAvatarImg: {
    width: '100%',
    height: '100%',
  },
  memberInfoCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  memberName: {
    fontFamily: AppFontFamily.bold,
    fontSize: 14,
    color: '#111827',
  },
  memberSubText: {
    fontFamily: AppFontFamily.regular,
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusPillActive: { backgroundColor: '#D1FAE5' },
  statusPillPending: { backgroundColor: '#FEF3C7' },
  statusPillText: { fontFamily: AppFontFamily.bold, fontSize: 10 },
  statusPillTextActive: { color: '#047857' },
  statusPillTextPending: { color: '#B45309' },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  toggleBtnActive: { backgroundColor: '#10B981' },
  toggleBtnDeactive: { backgroundColor: '#6B7280' },
  toggleBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  doneBtn: {
    width: '100%',
    height: 48,
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  doneBtnText: {
    fontFamily: AppFontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
