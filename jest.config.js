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
	testEnvironment: "jsdom",
}
