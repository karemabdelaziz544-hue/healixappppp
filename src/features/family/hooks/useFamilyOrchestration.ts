import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import { logger } from '../../../lib/logger';
import type { Profile } from '../../../types';

export function useFamilyOrchestration(userId: string | undefined) {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Profile[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(true);
  const [familyError, setFamilyError] = useState<Error | null>(null);

  const isInitialLoadDone = useRef(false);
  const currentProfileIdRef = useRef<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFamily = useCallback(async (silent = false) => {
    if (!userId) {
      setCurrentProfile(null);
      setFamilyMembers([]);
      setLoadingFamily(false);
      setFamilyError(null);
      isInitialLoadDone.current = false;
      currentProfileIdRef.current = null;
      return;
    }

    if (!silent && !isInitialLoadDone.current) {
      setLoadingFamily(true);
    }
    setFamilyError(null);

    try {
      const { data, error } = await executeQuery<Profile[]>(
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, manager_id, subscription_status, subscription_end_date, is_onboarded, gender, birth_date, weight, height')
          .or(`id.eq.${userId},manager_id.eq.${userId}`)
      );

      if (error) throw error;

      if (data && data.length > 0) {
        const memberIds = data.filter(member => member.manager_id).map(member => member.id);
        const { data: entitlements, error: entitlementError } = memberIds.length
          ? await executeQuery<{ member_id: string; status: 'included' | 'excluded' | 'expired' | 'cancelled'; included_until: string | null }[]>(
              supabase.from('family_subscription_memberships').select('member_id,status,included_until').in('member_id', memberIds).order('included_until', { ascending: false }).limit(100),
              { isIdempotent: true },
            )
          : { data: [], error: null };

        if (entitlementError) logger.warn('[FamilyOrchestration] entitlement fetch error:', entitlementError.message);
        const entitlementByMember = new Map<string, { status: 'included' | 'excluded' | 'expired' | 'cancelled'; included_until: string | null }>();
        entitlements?.forEach(entitlement => { if (!entitlementByMember.has(entitlement.member_id)) entitlementByMember.set(entitlement.member_id, entitlement); });

        const processedMembers = data.map(member => ({ ...member, is_onboarded: !!member.is_onboarded, entitlement: entitlementByMember.get(member.id) ?? null }));
        setFamilyMembers(processedMembers);

        const activeId = currentProfileIdRef.current;
        if (!activeId) {
          const persistedId = await AsyncStorage.getItem(`healix.active-profile.${userId}`);
          const persistedProfile = persistedId ? processedMembers.find(profile => profile.id === persistedId) : undefined;
          const mainProfile = persistedProfile || processedMembers.find(p => p.id === userId) || processedMembers[0];
          setCurrentProfile(mainProfile);
          currentProfileIdRef.current = mainProfile?.id || null;
        } else {
          const updatedCurrent = processedMembers.find(p => p.id === activeId);
          if (updatedCurrent) setCurrentProfile(updatedCurrent);
        }
      } else {
        logger.log('[FamilyOrchestration] New user profile missing in DB, auto-provisioning profile for:', userId);

        const fallbackProfile: Profile = {
          id: userId,
          full_name: 'مستخدم جديد',
          avatar_url: null,
          role: 'client',
          manager_id: null,
          subscription_status: 'no_subscription',
          subscription_end_date: null,
          is_onboarded: false,
        } as unknown as Profile;

        (async () => {
          try {
            const { data: created } = await supabase.from('profiles').upsert({
              id: userId,
              role: 'client',
              subscription_status: 'no_subscription',
              is_onboarded: false,
              created_at: new Date().toISOString()
            }).select();

            if (created && created[0]) {
              setCurrentProfile(created[0] as Profile);
              setFamilyMembers([created[0] as Profile]);
            }
          } catch (err: unknown) {
            logger.warn('[FamilyOrchestration] Auto-provision profile insert failed:', err);
          }
        })();

        setCurrentProfile(fallbackProfile);
        setFamilyMembers([fallbackProfile]);
        currentProfileIdRef.current = userId;
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('فشل في تحميل بيانات العائلة');
      logger.error('[FamilyOrchestration] Error fetching family:', error.message);
      setFamilyError(error);

      if (userId && !currentProfile) {
        const fallbackProfile: Profile = {
          id: userId,
          full_name: 'مستخدم جديد',
          role: 'client',
          subscription_status: 'no_subscription',
          is_onboarded: false,
        } as unknown as Profile;
        setCurrentProfile(fallbackProfile);
        setFamilyMembers([fallbackProfile]);
        currentProfileIdRef.current = userId;
      }
    } finally {
      setLoadingFamily(false);
      isInitialLoadDone.current = true;
    }
  }, [userId, currentProfile]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => { fetchFamily(true); }, 250);
  }, [fetchFamily]);

  const switchProfile = useCallback(async (profileId: string) => {
    const target = familyMembers.find(p => p.id === profileId);
    if (target) {
      setCurrentProfile(target);
      currentProfileIdRef.current = target.id;
      if (userId) {
        await AsyncStorage.setItem(`healix.active-profile.${userId}`, target.id);
      }
    }
  }, [familyMembers, userId]);

  /**
   * optimisticUpdateProfile — يحدّث currentProfile في الـ state مباشرة
   * دون انتظار DB re-fetch. مفيد عند تغيير is_onboarded للأكونت الفرعي
   * حيث RLS قد تُعيق قراءة الـ profile بعد التحديث.
   */
  const optimisticUpdateProfile = useCallback((patch: Partial<Profile>) => {
    setCurrentProfile(prev => prev ? { ...prev, ...patch } : prev);
    // أيضاً نحدّث في familyMembers
    setFamilyMembers(prev =>
      prev.map(m => m.id === currentProfileIdRef.current ? { ...m, ...patch } : m)
    );
  }, []);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  return {
    currentProfile,
    familyMembers,
    loadingFamily,
    familyError,
    fetchFamily,
    switchProfile,
    scheduleRefresh,
    optimisticUpdateProfile,
  };
}
