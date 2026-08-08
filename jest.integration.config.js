module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__integration_tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  verbose: true,
  testTimeout: 30000, // 30 seconds for real network calls
};
