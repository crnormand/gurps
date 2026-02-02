export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(.*)\\.js$': '$1',
    '^module/(.*)$': '<rootDir>/module/$1',
    '^../../lib/miscellaneous-settings\\.js$': '<rootDir>/test/stubs/miscellaneous-settings-stub.js',
    '^../lib/miscellaneous-settings\\.js$': '<rootDir>/test/stubs/miscellaneous-settings-stub.js',
    '^lib/miscellaneous-settings\\.js$': '<rootDir>/test/stubs/miscellaneous-settings-stub.js',
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
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['/node_modules/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFiles: ['./test/jest.setup.js'],
}
