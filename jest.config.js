export default {
	transform: {
		'^.+\\.jsx?$': 'babel-jest',
	},
	transformIgnorePatterns: ['/node_modules/'],
	moduleNameMapper: {
		"@/(.*)": "<rootDir>/src/$1"
	}
}
