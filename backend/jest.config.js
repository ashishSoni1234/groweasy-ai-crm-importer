/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        // Relaxed for tests — allow importing from src
        esModuleInterop: true,
        strict: false,
      },
    }],
  },
  // Increase timeout for retry tests that have delays
  testTimeout: 20000,
  // Show verbose output per test
  verbose: true,
};
