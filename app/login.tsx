import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from '../src/screens/LoginScreen'; 

export default function LoginRoute() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }}>
      <StatusBar style="dark" />
      <LoginScreen />
    </SafeAreaView>
  );
}