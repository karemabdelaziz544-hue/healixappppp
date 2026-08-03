import * as SplashScreen from 'expo-splash-screen';

let isSplashHidden = false;

export async function safeHideSplashScreen(): Promise<void> {
  if (isSplashHidden) return;
  isSplashHidden = true;
  try {
    await SplashScreen.hideAsync();
  } catch (err) {
    // Ignore error if native splash screen was already dismissed
  }
}
