export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    // Some tests import runtime-style paths (e.g. ../../module/foo.js) from within /test.
    // Map those to the TypeScript sources under /src.
    // Only map imports that walk up 2+ levels; avoid intercepting legitimate
    // relative imports inside src/ (e.g. ../util/* from src/module/*).
    '^(?:\\.\\./){2,}module/(.*)\\.js$': '<rootDir>/src/module/$1',
    '^(?:\\.\\./){2,}module/(.*)$': '<rootDir>/src/module/$1',
    '^(?:\\.\\./){2,}util/(.*)\\.js$': '<rootDir>/src/util/$1',
    '^(?:\\.\\./){2,}util/(.*)$': '<rootDir>/src/util/$1',

    // Support NodeNext-style explicit .js specifiers in TS path aliases.
    '^@module/(.*)\\.js$': '<rootDir>/src/module/$1',
    '^@lib/(.*)\\.js$': '<rootDir>/src/lib/$1',
    '^@util/(.*)\\.js$': '<rootDir>/src/util/$1',
    '^@rules/(.*)\\.js$': '<rootDir>/src/rules/$1',
    '^@gurps-types/(.*)\\.js$': '<rootDir>/src/types/$1',

    '^@module/(.*)$': '<rootDir>/src/module/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@util/(.*)$': '<rootDir>/src/util/$1',
    '^@rules/(.*)$': '<rootDir>/src/rules/$1',
    '^@gurps-types/(.*)$': '<rootDir>/src/types/$1',

    // For TS files using ESM imports with explicit .js extensions.
    '^(\\.{1,2}/.*)\\.js$': '$1',
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
