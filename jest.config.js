export default {
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/'],
  // Implementation of paths is currently disabled. TODO: enable after source files are moved to src
  // moduleNameMapper: {
  // 	"@/(.*)": "<rootDir>/src/$1"
  // }
}
