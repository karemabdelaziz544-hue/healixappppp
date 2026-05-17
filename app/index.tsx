import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export default function Index() {
  const { session, isLoading: authLoading } = useAuth();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('has_seen_onboarding').then(value => {
      setIsFirstLaunch(value === null);
    });
  }, []);
  
  if (authLoading || isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9F6F0', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2A4B46" />
      </View>
    );
  }
  
  if (isFirstLaunch) {
    return <Redirect href={"/onboarding" as any} />;
  }

  return <Redirect href={session ? "/(tabs)" : "/login"} />;
}