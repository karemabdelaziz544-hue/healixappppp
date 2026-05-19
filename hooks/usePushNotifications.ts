import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { logger } from '../src/lib/logger';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '../src/lib/supabase';
import { useFamily } from '../src/context/FamilyContext';
import { useRouter } from 'expo-router';
import { validateNotificationRoute } from '../src/lib/notificationRoutes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const { currentProfile } = useFamily();
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const lastSyncedTokenInfo = useRef<{ token: string; profileId: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // 1. تسجيل الجهاز واستخراج التوكن (بأمان)
    registerForPushNotificationsAsync()
      .then(async (token) => {
        if (token) {
          setExpoPushToken(token);
          if (currentProfile?.id) {
            // Check diff before updating
            if (
              lastSyncedTokenInfo.current?.token === token &&
              lastSyncedTokenInfo.current?.profileId === currentProfile.id
            ) {
              return; // Already synced for this exact token & profile combination
            }

            const { error } = await supabase
              .from('profiles')
              .update({ fcm_token: token })
              .eq('id', currentProfile.id);

            if (!error) {
              lastSyncedTokenInfo.current = { token, profileId: currentProfile.id };
            }
          }
        }
      })
      .catch(logger.error); // منع الكراش الصامت

    // 2. مستمع للإشعارات
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      logger.log('Received notification:', notification);
    });

    // 3. مستمع لضغط المستخدم على الإشعار
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // 🔴 SECURITY FIX: Validate deep-link against allowlist before navigating.
      // Previously: router.push(data.screen as any) — allows arbitrary route injection from payload.
      // Now: only routes in ALLOWED_NOTIFICATION_ROUTES are accepted; others are silently dropped.
      const safeRoute = validateNotificationRoute(data?.screen);
      if (safeRoute) {
        router.push(safeRoute as any);
      } else if (data?.screen) {
        logger.warn(`[PushNotification] Blocked unauthorized deep-link: "${data.screen}"`);
      }
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [currentProfile?.id]);

  return { expoPushToken };
}

// دالة طلب الصلاحية والتسجيل
async function registerForPushNotificationsAsync() {
  let token;

  // 🔥 السر هنا: التأكد إننا مش شغالين على Expo Go
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  
  if (isExpoGo) {
    logger.log('⚠️ الإشعارات لا تعمل داخل تطبيق Expo Go. سيتم تخطيها بأمان مؤقتاً.');
    return undefined; // نرجع فاضي عشان ميكرش التطبيق وتقدر تسجل دخول
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2A4B46',
    });
  }

  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        logger.error('Failed to get push token for push notification!');
        return undefined;
      }
      
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      logger.error("Error getting push token:", e);
    }
  } else {
    logger.log('يجب استخدام جهاز حقيقي لاختبار الإشعارات');
  }

  return token;
}