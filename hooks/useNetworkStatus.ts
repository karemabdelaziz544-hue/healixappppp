import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { OfflineQueue } from '../src/lib/offlineQueue';
import { logger } from '../src/lib/logger';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // فحص أولي عند تحميل التطبيق
    NetInfo.fetch().then((state: NetInfoState) => {
      const nextConnected = state.isConnected ?? true;
      setIsConnected(nextConnected);
      setIsChecking(false);
      if (nextConnected) {
        OfflineQueue.sync().catch(err => logger.error('[useNetworkStatus] init sync err:', err));
      }
    });

    // الاستماع لتغييرات الاتصال
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const nextConnected = state.isConnected ?? true;
      setIsConnected(nextConnected);
      if (nextConnected) {
        OfflineQueue.sync().catch(err => logger.error('[useNetworkStatus] change sync err:', err));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isConnected, isChecking };
}
