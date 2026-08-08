import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useFamilyOrchestration } from '../features/family/hooks/useFamilyOrchestration';
import type { Profile } from '../types';

interface FamilyContextType {
  /** Authenticated account identity; unlike currentProfile this never changes when viewing a family member. */
  accountProfileId: string | undefined;
  currentProfile: Profile | null;
  familyMembers: Profile[];
  /** 🔴 AUDIT 8 FIX: Now returns Promise<void> matching async contract */
  switchProfile: (profileId: string) => Promise<void>;
  refreshFamily: () => void;
  /** Optimistically updates currentProfile in local state without DB re-fetch */
  optimisticUpdateProfile: (patch: Partial<Profile>) => void;
  loadingFamily: boolean;
  /** 🔴 AUDIT 8 FIX: Surfaced error state for retry UI */
  familyError: Error | null;
}

const FamilyContext = createContext<FamilyContextType | null>(null);

export const FamilyProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  
  const { currentProfile, familyMembers, switchProfile, fetchFamily, loadingFamily, familyError, optimisticUpdateProfile } = useFamilyOrchestration(userId);

  return (
    <FamilyContext.Provider value={{
      accountProfileId: userId,
      currentProfile,
      familyMembers,
      switchProfile,
      refreshFamily: fetchFamily,
      optimisticUpdateProfile,
      loadingFamily,
      familyError,
    }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (!context) throw new Error("useFamily must be used within a FamilyProvider");
  return context;
};
