import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/core/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/core/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  maxWorkers: 1, // Run tests sequentially
}

export default config;
