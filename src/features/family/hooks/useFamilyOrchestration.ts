import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import { logger } from '../../../lib/logger';
import type { Profile } from '../../../types';

/**
 * useFamilyOrchestration — manages family profile state.
 *
 * 🔴 AUDIT 8 FIX (Issue 1): Added explicit `familyError` state.
 * Previously errors were swallowed in catch — user saw stale/empty data
 * with no recovery CTA.
 *
 * 🔴 AUDIT 8 FIX (Issue 2): `switchProfile` returns Promise<void>.
 * Previously typed as sync void but awaited by tab bar — causing
 * a type/contract mismatch.
 */
export function useFamilyOrchestration(userId: string | undefined) {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Profile[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(true);
  // 🔴 AUDIT 8 FIX: Surfaced error state for UI recovery affordance
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
    // Clear error on new fetch attempt
    setFamilyError(null);

    try {
      const { data, error } = await executeQuery<Profile[]>(
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, manager_id, subscription_status, subscription_end_date, is_onboarded, gender, birth_date, weight, height')
          .or(`id.eq.${userId},manager_id.eq.${userId}`)
      );

      if (error) throw error;

      if (data) {
        const memberIds = data.filter(member => member.manager_id).map(member => member.id);
        const { data: entitlements, error: entitlementError } = memberIds.length
          ? await executeQuery<{ member_id: string; status: 'included' | 'excluded' | 'expired' | 'cancelled'; included_until: string | null }[]>(
              supabase.from('family_subscription_memberships').select('member_id,status,included_until').in('member_id', memberIds).order('included_until', { ascending: false }),
              { isIdempotent: true },
            )
          : { data: [], error: null };
        if (entitlementError) logger.warn('[FamilyOrchestration] entitlement fetch error:', entitlementError.message);
        const entitlementByMember = new Map<string, { status: 'included' | 'excluded' | 'expired' | 'cancelled'; included_until: string | null }>();
        entitlements?.forEach(entitlement => { if (!entitlementByMember.has(entitlement.member_id)) entitlementByMember.set(entitlement.member_id, entitlement); });
        // Never copy the manager subscription onto children. Their entitlement
        // is explicit and can represent excluded/expired/cancelled correctly.
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
      }
    } catch (err: unknown) {
      // 🔴 AUDIT 8 FIX: Surface error instead of swallowing it
      const error = err instanceof Error ? err : new Error('فشل في تحميل بيانات العائلة');
      logger.error('[FamilyOrchestration] Error fetching family:', error.message);
      setFamilyError(error);
    } finally {
      setLoadingFamily(false);
      isInitialLoadDone.current = true;
    }
  }, [userId]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => { fetchFamily(true); }, 250);
  }, [fetchFamily]);

  useEffect(() => {
    isInitialLoadDone.current = false;
    fetchFamily();

    if (!userId) return;

    const channel = supabase.channel(`family-changes-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `manager_id=eq.${userId}` }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_subscription_memberships', filter: `manager_id=eq.${userId}` }, () => scheduleRefresh())
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  // Coalesce updates from the manager row and its membership rows.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, fetchFamily, scheduleRefresh]);

  /**
   * 🔴 AUDIT 8 FIX (Issue 2): switchProfile is now async (Promise<void>).
   * Previously typed as sync void but tab bar awaited it — contract mismatch.
   * Now the caller can await and show toast after state is confirmed.
   */
  const switchProfile = useCallback(async (profileId: string): Promise<void> => {
    const profile = familyMembers.find(p => p.id === profileId);
    if (profile) {
      setCurrentProfile(profile);
      currentProfileIdRef.current = profile.id;
      if (userId) await AsyncStorage.setItem(`healix.active-profile.${userId}`, profile.id);
    }
  }, [familyMembers, userId]);

  return {
    currentProfile,
    familyMembers,
    switchProfile,
    fetchFamily,
    loadingFamily,
    /** 🔴 AUDIT 8 FIX: Error state for UI retry affordance */
    familyError,
  };
}
