import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { executeQuery } from '../../../lib/apiClient';
import { logger } from '../../../lib/logger';
import type { Profile } from '../../../types';

export function useFamilyOrchestration(userId: string | undefined) {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Profile[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(true);

  const isInitialLoadDone = useRef(false);
  const currentProfileIdRef = useRef<string | null>(null);

  const fetchFamily = async (silent = false) => {
    if (!userId) {
      setCurrentProfile(null);
      setFamilyMembers([]);
      setLoadingFamily(false);
      isInitialLoadDone.current = false;
      currentProfileIdRef.current = null;
      return;
    }

    if (!silent && !isInitialLoadDone.current) {
      setLoadingFamily(true);
    }

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
    } catch (err) {
      logger.error("Error fetching family:", err);
    } finally {
      setLoadingFamily(false);
      isInitialLoadDone.current = true;
    }
  };

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
  }, [userId]);

  const switchProfile = (profileId: string) => {
    const profile = familyMembers.find(p => p.id === profileId);
    if (profile) {
      setCurrentProfile(profile);
      currentProfileIdRef.current = profile.id;
    }
  };

  return { currentProfile, familyMembers, switchProfile, fetchFamily, loadingFamily };
}
