import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { clearQueryCache } from '../hooks/useSupabaseQuery';

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, isLoading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // جلب الجلسة أول ما التطبيق يفتح
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // مراقبة أي تغيير لحظي (دخول أو خروج)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // 🔴 C3-FIX: Flush cache on logout to prevent cross-session data leaks.
      // Without this, User A's cached medical/plan data could be served to User B.
      if (event === 'SIGNED_OUT') {
        clearQueryCache();
      }
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);