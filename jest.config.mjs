export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
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
