export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    // Support legacy test imports that reference `lib/` and `module/` at repo root.
    '^lib/(.*)$': '<rootDir>/src/util/$1',
    '^module/(.*)$': '<rootDir>/src/module/$1',

    // Support legacy *relative* test imports that referenced `lib/` and `module/` at repo root.
    '^\\.\\./\\.\\./lib/(.*)$': '<rootDir>/src/util/$1',
    '^\\.\\./\\.\\./\\.\\./lib/(.*)$': '<rootDir>/src/util/$1',
    '^\\.\\./\\.\\./\\.\\./\\.\\./lib/(.*)$': '<rootDir>/src/util/$1',
    '^\\.\\./\\.\\./module/(.*)$': '<rootDir>/src/module/$1',
    '^\\.\\./\\.\\./\\.\\./module/(.*)$': '<rootDir>/src/module/$1',
    '^\\.\\./\\.\\./\\.\\./\\.\\./module/(.*)$': '<rootDir>/src/module/$1',

    '^@module/(.*)$': '<rootDir>/src/module/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@util/(.*)$': '<rootDir>/src/util/$1',
    '^@rules/(.*)$': '<rootDir>/src/rules/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^util/(.*)$': '<rootDir>/src/util/$1',
    '^rules/(.*)$': '<rootDir>/src/rules/$1',
    '^types/(.*)$': '<rootDir>/src/types/$1',
    '^../../lib/miscellaneous-settings\\.js$': '<rootDir>/test/stubs/miscellaneous-settings-stub.js',
    '^../lib/miscellaneous-settings\\.js$': '<rootDir>/test/stubs/miscellaneous-settings-stub.js',
    '^lib/miscellaneous-settings\\.js$': '<rootDir>/test/stubs/miscellaneous-settings-stub.js',

    // Keep `.js` specifiers working for TS/ESM tests.
    '^(.*)\\.js$': '$1',
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
