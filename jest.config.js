module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testTimeout: 10000,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|@supabase/supabase-js)',
  ],
  // Explicitly set to false to avoid jest-mock v30/v29 compatibility issues
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false,
};
