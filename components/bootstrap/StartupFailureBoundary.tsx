import { Text } from '@/components/AppText';
import { AppFontFamily } from "@/constants/AppTheme";

import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';;
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';

interface StartupFailureBoundaryProps {
  error: Error | null;
  session: any;
  isLoading: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}

let isSplashScreenHidden = false;

export function StartupFailureBoundary({
  error,
  session,
  isLoading,
  onRetry,
  children,
}: StartupFailureBoundaryProps) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!isLoading && error) {
      // Hide splash screen so user can see the error screen
      if (!isSplashScreenHidden) {
        isSplashScreenHidden = true;
        SplashScreen.hideAsync().catch(() => {});
      }
      // Report to Sentry
      Sentry.captureException(error, {
        tags: { context: 'auth_bootstrap' },
      });
    }
  }, [error, isLoading]);

  if (!isLoading && error) {
    const handleRetry = () => {
      setRetrying(true);
      onRetry();
      setTimeout(() => setRetrying(false), 2000);
    };

    return (
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Ionicons name="cloud-offline" size={50} color="#EF4444" />
        </View>
        <Text style={styles.title}>تعذّر الاتصال</Text>
        <Text style={styles.message}>
          لم نتمكن من تحميل بيانات حسابك. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.
        </Text>
        {__DEV__ && error && (
          <Text style={styles.debugText}>{error.message}</Text>
        )}
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={handleRetry}
          disabled={retrying}
          activeOpacity={0.8}
          accessibilityLabel="إعادة المحاولة"
          accessibilityRole="button"
        >
          {retrying ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color="#FFF" />
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F6F0', padding: 40 },
  iconBox: { width: 100, height: 100, backgroundColor: '#FEE2E2', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  title: { fontSize: 24, fontWeight: '900', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 26, marginBottom: 15, fontWeight: '600' },
  debugText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 20, fontFamily: AppFontFamily.regular },
  retryBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#2A4B46', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15 },
  retryText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
