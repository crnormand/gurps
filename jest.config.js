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
}
