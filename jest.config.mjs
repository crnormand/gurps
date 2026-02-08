export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@module/(.*)$': '<rootDir>/src/module/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@util/(.*)$': '<rootDir>/src/util/$1',
    '^@rules/(.*)$': '<rootDir>/src/rules/$1',
    '^@gurps-types/(.*)$': '<rootDir>/src/types/$1',
  },
  testPathIgnorePatterns: ['/dist/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  moduleFileExtensions: ['js', 'ts', 'json', 'node'],
  transformIgnorePatterns: ['/node_modules/'],
  setupFiles: ['./test/jest.setup.js'],
}
