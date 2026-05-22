import { useState, useEffect, useRef, useCallback } from 'react';
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
        const manager = data.find(p => p.id === userId);

        const processedMembers = data.map(member => {
          const safeMember = { ...member, is_onboarded: !!member.is_onboarded };

          if (safeMember.manager_id && manager) {
            const managerStatus = manager.subscription_status;
            const memberStatus = safeMember.subscription_status;
            let inheritedStatus = memberStatus;
            
            if (managerStatus === 'new') inheritedStatus = 'new';
            else if (managerStatus === 'expired' || memberStatus === 'expired') inheritedStatus = 'expired';
            else if (managerStatus === 'active') inheritedStatus = 'active';

            return {
              ...safeMember,
              subscription_status: inheritedStatus,
              subscription_end_date: manager.subscription_end_date,
            };
          }
          return safeMember;
        });

        setFamilyMembers(processedMembers);

        const activeId = currentProfileIdRef.current;
        if (!activeId) {
          const mainProfile = processedMembers.find(p => p.id === userId) || processedMembers[0];
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

  useEffect(() => {
    isInitialLoadDone.current = false;
    fetchFamily();

    if (!userId) return;

    const channel = supabase.channel(`family-changes-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => fetchFamily(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `manager_id=eq.${userId}` }, () => fetchFamily(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchFamily]);

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
    }
  }, [familyMembers]);

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
