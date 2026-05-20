import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { clearQueryCache } from '../hooks/useSupabaseQuery';
import { logger } from '../lib/logger';

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  /** 🔴 AUDIT FIX: Exposed so _layout can show a recovery screen instead of stuck splash */
  authError: Error | null;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  authError: null,
  retryAuth: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  const bootstrapAuth = () => {
    setIsLoading(true);
    setAuthError(null);

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          logger.error('[AuthContext] getSession failed:', error.message);
          setAuthError(error);
        }
        setSession(session);
      })
      .catch((err: unknown) => {
        // 🔴 AUDIT FIX: Catches network failures, corrupt storage, etc.
        const error = err instanceof Error ? err : new Error('Auth startup failed');
        logger.error('[AuthContext] getSession crashed:', error.message);
        setAuthError(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;

    bootstrapAuth();

    // مراقبة أي تغيير لحظي (دخول أو خروج)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // 🔴 C3-FIX: Flush cache on logout to prevent cross-session data leaks.
      if (event === 'SIGNED_OUT') {
        clearQueryCache();
      }
      if (isMounted) {
        setSession(session);
        setIsLoading(false);
        setAuthError(null); // Clear error on successful auth event
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading, authError, retryAuth: bootstrapAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);