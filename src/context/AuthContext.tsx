import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { clearQueryCache } from '../hooks/useSupabaseQuery';
import { logger } from '../lib/logger';

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  /** Exposed so _layout can show a recovery screen instead of stuck splash */
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

  /**
   * 🔴 AUDIT 7 FIX (Issue 3): Eliminated duplicate bootstrap.
   *
   * Previously: bootstrapAuth() called getSession() AND onAuthStateChange
   * was subscribed simultaneously. Supabase's onAuthStateChange fires an
   * INITIAL_SESSION event immediately on subscription, so getSession()
   * was redundant — causing double state updates and render frame waste.
   *
   * Now: We rely exclusively on onAuthStateChange for the structural baseline.
   * retryAuth() is kept for explicit user-triggered retries only.
   */
  const setupAuthListener = () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        // 🔴 C3-FIX: Flush cache on logout to prevent cross-session data leaks.
        if (event === 'SIGNED_OUT') {
          clearQueryCache();
        }

        setSession(newSession);
        setIsLoading(false);
        setAuthError(null);
      });

      return subscription;
    } catch (err: unknown) {
      // Catches synchronous failures in subscription setup (corrupt client, etc.)
      const error = err instanceof Error ? err : new Error('Auth listener setup failed');
      logger.error('[AuthContext] onAuthStateChange setup failed:', error.message);
      setAuthError(error);
      setIsLoading(false);
      return null;
    }
  };

  /**
   * retryAuth — for explicit user-triggered retry from StartupErrorScreen.
   * Uses getSession() as a one-shot recovery mechanism since the listener
   * may have failed to initialize.
   */
  const retryAuth = () => {
    setIsLoading(true);
    setAuthError(null);

    supabase.auth.getSession()
      .then(({ data: { session: newSession }, error }) => {
        if (error) {
          logger.error('[AuthContext] retryAuth failed:', error.message);
          setAuthError(error);
        }
        setSession(newSession);
      })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error('Auth retry failed');
        logger.error('[AuthContext] retryAuth crashed:', error.message);
        setAuthError(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    const subscription = setupAuthListener();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading, authError, retryAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);