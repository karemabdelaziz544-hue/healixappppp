import { Text } from '@/components/AppText';
import React, { useState, useEffect, useCallback } from 'react';
import { useEntitlements } from '../../../src/features/subscriptions/useEntitlements';
import { useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Image, Modal, FlatList } from 'react-native';
import { AppColors } from '../../../constants/AppTheme';
import { NotificationIcon, StreakIcon, CheckmarkIcon, SwapIcon, LockIcon, SparklesIcon } from '../../../components/icons';
import { getCachedSignedUrl } from '../../../src/lib/storageCache';
import type { Profile } from '../../../src/types';

interface DashboardHeaderWidgetProps {
  fullName?: string;
  greeting?: string;
  avatarUrl?: string | null;
  streakDays?: number;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  /** Family account switching */
  familyMembers?: Profile[];
  currentProfile?: Profile | null;
  accountProfileId?: string;
  onSwitchProfile?: (profileId: string) => Promise<void>;
}

export const DashboardHeaderWidget: React.FC<DashboardHeaderWidgetProps> = React.memo(({
  fullName = '',
  greeting = 'صباح الخير',
  avatarUrl,
  streakDays = 0,
  onNotificationPress,
  onProfilePress,
  familyMembers = [],
  currentProfile,
  accountProfileId,
  onSwitchProfile,
}) => {
  const router = useRouter();
  const { plan, canUse, userRole } = useEntitlements();
  const firstName = fullName ? (fullName.split(' ')[0] || fullName) : 'المستخدم';
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(null);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [memberAvatars, setMemberAvatars] = useState<Record<string, string | null>>({});

  const isDoctorOrAdmin = currentProfile?.role === 'doctor' || currentProfile?.role === 'admin' || userRole === 'admin' || userRole === 'doctor';
  const isFamily = plan === 'FAMILY';
  const isPremium = plan === 'INDIVIDUAL' || canUse('NUTRITION_PLAN');

  const badgeText = isDoctorOrAdmin
    ? 'أدمن / دكتور'
    : isFamily
      ? 'عائلي'
      : isPremium
        ? 'بريميوم'
        : 'الباقة Free';

  const badgeIconColor = isDoctorOrAdmin
    ? '#1D4ED8'
    : isFamily
      ? '#6D28D9'
      : isPremium
        ? '#047857'
        : '#4B5563';

  // Resolve avatar URL (handles Supabase storage paths)
  useEffect(() => {
    const resolveAvatar = async () => {
      if (!avatarUrl) {
        setResolvedAvatarUrl(null);
        return;
      }
      if (avatarUrl.startsWith('http')) {
        setResolvedAvatarUrl(avatarUrl);
      } else {
        try {
          const signedUrl = await getCachedSignedUrl('avatars', avatarUrl, 3600);
          setResolvedAvatarUrl(signedUrl);
        } catch {
          setResolvedAvatarUrl(null);
        }
      }
    };
    resolveAvatar();
  }, [avatarUrl]);

  // Resolve avatars for all family members when switcher opens
  useEffect(() => {
    if (!showAccountSwitcher || familyMembers.length === 0) return;

    const resolveAllAvatars = async () => {
      const avatars: Record<string, string | null> = {};
      for (const member of familyMembers) {
        if (!member.avatar_url) {
          avatars[member.id] = null;
        } else if (member.avatar_url.startsWith('http')) {
          avatars[member.id] = member.avatar_url;
        } else {
          try {
            avatars[member.id] = await getCachedSignedUrl('avatars', member.avatar_url, 3600);
          } catch {
            avatars[member.id] = null;
          }
        }
      }
      setMemberAvatars(avatars);
    };
    resolveAllAvatars();
  }, [showAccountSwitcher, familyMembers]);

  const hasMultipleAccounts = familyMembers.length > 1;

  const handleAvatarPress = useCallback(() => {
    if (hasMultipleAccounts) {
      setShowAccountSwitcher(true);
    } else if (onProfilePress) {
      onProfilePress();
    }
  }, [hasMultipleAccounts, onProfilePress]);

  const handleSwitchProfile = useCallback(async (profileId: string) => {
    setShowAccountSwitcher(false);
    if (onSwitchProfile) {
      await onSwitchProfile(profileId);
    }
  }, [onSwitchProfile]);

  const renderMemberItem = useCallback(({ item }: { item: Profile }) => {
    const isActive = currentProfile?.id === item.id;
    const isMainAccount = !item.manager_id;
    const memberAvatar = memberAvatars[item.id];
    const memberFirstName = item.full_name ? (item.full_name.split(' ')[0] || item.full_name) : '';

    return (
      <TouchableOpacity
        style={[styles.memberRow, isActive && styles.memberRowActive]}
        onPress={() => handleSwitchProfile(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.memberInfo}>
          <View>
            <Text style={[styles.memberName, isActive && styles.memberNameActive]}>
              {item.full_name || 'بدون اسم'}
            </Text>
            <Text style={styles.memberRole}>
              {isMainAccount ? 'الحساب الرئيسي' : 'حساب تابع'}
            </Text>
          </View>
          {isActive && (
            <View style={styles.activeCheck}>
              <CheckmarkIcon size={12} color={AppColors.white} />
            </View>
          )}
        </View>

        <View style={[styles.memberAvatarWrap, isActive && styles.memberAvatarWrapActive]}>
          {memberAvatar ? (
            <Image source={{ uri: memberAvatar }} style={styles.memberAvatarImg} />
          ) : (
            <View style={[styles.memberAvatarFallback, isActive && styles.memberAvatarFallbackActive]}>
              <Text style={styles.memberAvatarInitial}>
                {memberFirstName.charAt(0) || '?'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [currentProfile, memberAvatars, handleSwitchProfile]);

  const badgeStyle = isDoctorOrAdmin
    ? styles.badgeDoctor
    : isFamily
      ? styles.badgeFamily
      : isPremium
        ? styles.badgePremium
        : styles.badgeFree;

  const badgeTextStyle = isDoctorOrAdmin
    ? styles.badgeDoctorText
    : isFamily
      ? styles.badgeFamilyText
      : isPremium
        ? styles.badgePremiumText
        : styles.badgeFreeText;

  return (
    <>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.headerProfileRow} onPress={handleAvatarPress} activeOpacity={0.85}>
          <View style={[styles.avatarWrap, hasMultipleAccounts && styles.avatarWrapSwitchable]}>
            {resolvedAvatarUrl ? (
              <Image source={{ uri: resolvedAvatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{firstName.charAt(0)}</Text>
              </View>
            )}
            {hasMultipleAccounts && (
              <View style={styles.switchBadge}>
                <SwapIcon size={10} color={AppColors.white} />
              </View>
            )}
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerGreeting}>{greeting}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.badgeContainer, badgeStyle]}
            onPress={() => router.push('/subscriptions' as any)}
            activeOpacity={0.8}
          >
            {isPremium || isDoctorOrAdmin || isFamily ? (
              <SparklesIcon size={12} color={badgeIconColor} />
            ) : (
              <LockIcon size={12} color={badgeIconColor} />
            )}
            <Text style={[styles.badgeTextBase, badgeTextStyle]}>
              {badgeText}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconCircleBtn} onPress={onNotificationPress} activeOpacity={0.8}>
            <NotificationIcon size={20} color={AppColors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Switcher Modal */}
      <Modal
        visible={showAccountSwitcher}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountSwitcher(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAccountSwitcher(false)}
        >
          <View style={styles.switcherContainer}>
            <View style={styles.switcherHeader}>
              <TouchableOpacity onPress={() => setShowAccountSwitcher(false)} activeOpacity={0.7}>
                <Text style={styles.switcherClose}>إغلاق</Text>
              </TouchableOpacity>
              <Text style={styles.switcherTitle}>تبديل الحساب</Text>
            </View>

            <FlatList
              data={familyMembers}
              keyExtractor={(item) => item.id}
              renderItem={renderMemberItem}
              contentContainerStyle={styles.memberList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

DashboardHeaderWidget.displayName = 'DashboardHeaderWidget';

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: AppColors.primaryFixed,
    overflow: 'hidden',
  },
  avatarWrapSwitchable: {
    borderColor: AppColors.primary,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: AppColors.white,
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
  },
  switchBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    backgroundColor: AppColors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppColors.background,
  },
  headerTextGroup: {
    alignItems: 'flex-start',
  },
  headerGreeting: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  headerName: {
    fontSize: 12,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeTextBase: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
  },
  badgePremium: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badgePremiumText: {
    color: '#047857',
  },
  badgeFree: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  badgeFreeText: {
    color: '#4B5563',
  },
  badgeFamily: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  badgeFamilyText: {
    color: '#6D28D9',
  },
  badgeDoctor: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  badgeDoctorText: {
    color: '#1D4ED8',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  streakText: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },

  // Account Switcher Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  switcherContainer: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  switcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderSubtle,
  },
  switcherTitle: {
    fontSize: 18,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  switcherClose: {
    fontSize: 14,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
  },
  memberList: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.surfaceContainerLowest,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  memberRowActive: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primaryLight,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontFamily: 'Thmanyah-Bold',
    color: AppColors.primary,
  },
  memberNameActive: {
    color: AppColors.primary,
  },
  memberRole: {
    fontSize: 11,
    fontFamily: 'Thmanyah-Regular',
    color: AppColors.outline,
    marginTop: 2,
  },
  activeCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: AppColors.outlineVariant,
    overflow: 'hidden',
  },
  memberAvatarWrapActive: {
    borderColor: AppColors.primary,
  },
  memberAvatarImg: {
    width: '100%',
    height: '100%',
  },
  memberAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: AppColors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarFallbackActive: {
    backgroundColor: AppColors.primary,
  },
  memberAvatarInitial: {
    color: AppColors.white,
    fontSize: 16,
    fontFamily: 'Thmanyah-Bold',
  },
});
