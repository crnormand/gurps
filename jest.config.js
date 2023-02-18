// SPDX-FileCopyrightText: 2022 Johannes Loher
//
// SPDX-License-Identifier: MIT
//
export default {
	// [...]
	transform: {
		// '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
		// '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
		"^.+\\.[tj]sx?$": [
			"ts-jest",
			{
				tsconfig: "<rootDir>/test/tsconfig.json",
			},
		],
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
