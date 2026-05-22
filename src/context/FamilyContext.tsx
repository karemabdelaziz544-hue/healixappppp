import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useFamilyOrchestration } from '../features/family/hooks/useFamilyOrchestration';
import type { Profile } from '../types';

interface FamilyContextType {
  currentProfile: Profile | null;
  familyMembers: Profile[];
  /** 🔴 AUDIT 8 FIX: Now returns Promise<void> matching async contract */
  switchProfile: (profileId: string) => Promise<void>;
  refreshFamily: () => void;
  loadingFamily: boolean;
  /** 🔴 AUDIT 8 FIX: Surfaced error state for retry UI */
  familyError: Error | null;
}

const FamilyContext = createContext<FamilyContextType | null>(null);

export const FamilyProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  
  const { currentProfile, familyMembers, switchProfile, fetchFamily, loadingFamily, familyError } = useFamilyOrchestration(userId);

  return (
    <FamilyContext.Provider value={{
      currentProfile,
      familyMembers,
      switchProfile,
      refreshFamily: fetchFamily,
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