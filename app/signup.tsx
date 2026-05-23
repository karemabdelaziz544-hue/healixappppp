import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import SignupScreen from '../src/screens/SignupScreen'; 

export default function SignupRoute() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F6F0' }}>
      <StatusBar style="dark" />
      <SignupScreen />
    </SafeAreaView>
  );
}