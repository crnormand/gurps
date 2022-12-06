// // SPDX-FileCopyrightText: 2022 Johannes Loher
// //
// // SPDX-License-Identifier: MIT

// export default {
// 	preset: "ts-jest",
// 	testEnvironment: "node",
// 	moduleDirectories: ["node_modules", "src"],
// 	globals: {
// 		"ts-jest": {
// 			tsconfig: "<rootDir>/test/tsconfig.json",
// 		},
// 	},
// 	reporters: [
// 		"default",
// 		[
// 			"./node_modules/jest-html-reporter",
// 			{
// 				pageTitle: "Test Report",
// 			},
// 		],
// 	],
// 	moduleFileExtensions: [
// 		"js",
// 		"json",
// 		"ts"
// 	],
// 	roots: [
// 		"src"
// 	],
// 	testRegex: ".spec.ts$",
// 	transform: {
// 		"^.+\\.(t|j)s$": "ts-jest"
// 	},
// 	coverageDirectory: "../coverage",
// 	testEnvironment: "node",
// 	moduleNameMapper: {
// 		"src/(.*)": "<rootDir>/src/$1"
// 	}
// }

// SPDX-FileCopyrightText: 2022 Johannes Loher
//
// SPDX-License-Identifier: MIT

export default {
	preset: "ts-jest",
	testEnvironment: "node",
	globals: {
		"ts-jest": {
			tsconfig: "<rootDir>/test/tsconfig.json",
		},
	},
	reporters: [
		"default",
		[
			"./node_modules/jest-html-reporter",
			{
				pageTitle: "Test Report",
			},
		],
	],
	moduleNameMapper: {
		"@assets/(.*)": "<rootDir>/src/assets/$1",
		"@actor/(.*)": "<rootDir>/src/module/actor/$1",
		"@actor": "<rootDir>/src/module/actor/",
		"@item/(.*)": "<rootDir>/src/module/item/$1",
		"@item": "<rootDir>/src/module/item/",
		"@feature/(.*)": "<rootDir>/src/module/feature/$1",
		"@feature": "<rootDir>/src/module/feature/",
		"@prereq/(.*)": "<rootDir>/src/module/prereq/$1",
		"@prereq": "<rootDir>/src/module/prereq/",
		"@module/(.*)": "<rootDir>/src/module/$1",
		"@scripts/(.*)": "<rootDir>/src/scripts/$1",
		"@util/(.*)": "<rootDir>/src/util/$1",
		"@util": "<rootDir>/src/util/",
	},
}
