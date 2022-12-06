import { OtFLinkedAction } from "./../../src/module/otf/base";
/* eslint-disable jest/no-disabled-tests */
import { OtFCostsAction, parselink } from "@module/otf"

describe("too small or non-matching", () => {
	it("empty", () => {
		let s = ""
		let parsed_otf = parselink(s)
		expect(parsed_otf.action).toBeUndefined()
		expect(parsed_otf.text).toBe(s)
	})
	it("size 1", () => {
		let s = "X"
		let parsed_otf = parselink(s)
		expect(parsed_otf.action).toBeUndefined()
		expect(parsed_otf.text).toBe(s)
	})
	it("non-matching", () => {
		let s = "this should not match anything"
		let parsed_otf = parselink(s)
		expect(parsed_otf.action).toBeUndefined()
		expect(parsed_otf.text).toBe(s)
	})
})
describe("modifiers", () => {
	it("+1", () => {
		let s = "+1"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("modifier")
			expect(action.num).toBe(1)
		} else
			expect(action).toBeDefined()
	})
	it("-1", () => {
		let s = "-1"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("modifier")
			expect(action.num).toBe(-1)
		} else
			expect(action).toBeDefined()
	})
	it("+1 desc", () => {
		let s = "+1 desc"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("modifier")
			expect(action.num).toBe(1)
			expect(action.desc).toBe("desc")
		} else
			expect(action).toBeDefined()
	})
	it("-1 desc", () => {
		let s = "-1 desc"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("modifier")
			expect(action.num).toBe(-1)
			expect(action.desc).toBe("desc")
		} else
			expect(action).toBeDefined()
	})
	it("+1 desc & -2 desc2", () => {
		let s = "+1 desc & -2 desc2"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("modifier")
			expect(action.num).toBe(1)
			expect(action.desc).toBe("desc")
			action = <OtFCostsAction>action.next
			if (action) {
				expect(action.type).toBe("modifier")
				expect(action.num).toBe(-2)
				expect(action.desc).toBe("desc2")
			}
			else
				expect(action).toBeDefined()
		} else
			expect(action).toBeDefined()
	})
	it("-@margin desc", () => {
		let s = "-@margin desc"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("modifier")
			expect(action.num).toBeUndefined()
			expect(action.margin).toBe("-@margin")
			expect(action.desc).toBe(s)
		} else
			expect(action).toBeDefined()
	})
})
describe("chat", () => {
	it("/cmd", () => {
		let s = "/cmd"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("chat")
			expect(action.orig).toBe(s)
		}
		expect(parsed_otf.text).toMatch(new RegExp(`<span[^>]+>${s}</span>`))
	})
	it("!/cmd", () => {
		let s = "!/cmd"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("chat")
			expect(action.orig).toBe("/cmd")
			expect(action.blindroll).toBeTruthy()
		}
		expect(parsed_otf.text).toMatch(new RegExp("<span[^>]+>/cmd</span>"))
	})
	it("'override'/cmd", () => {
		let s = "'override'/cmd"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("chat")
			expect(action.orig).toBe("/cmd")
		}
		expect(parsed_otf.text).toMatch(new RegExp("override"))
	})
	it('"override"/cmd', () => {
		let s = "'override'/cmd"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("chat")
			expect(action.orig).toBe("/cmd")
		}
		expect(parsed_otf.text).toMatch(new RegExp("override"))
	})
})
describe("html", () => {
	it("http:///someplace", () => {
		let s = "http:///someplace"
		let parsed_otf = parselink(s)
		let action = <OtFLinkedAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("href")
			expect(action.orig).toBe(s)
		}
		expect(parsed_otf.text).toMatch(new RegExp(`<a href="${s}">${s}</a>`))
	})
	it("https:///someplace", () => {
		let s = "https:///someplace"
		let parsed_otf = parselink(s)
		let action = <OtFLinkedAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("href")
			expect(action.orig).toBe(s)
			expect(action.blindroll).toBeTruthy()
		}
		expect(parsed_otf.text).toMatch(new RegExp(`<a href="${s}">${s}</a>`))
	})
	it("'override'http:///someplace", () => {
		let s = "'override'http:///someplace"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		if (action) {
			expect(action.type).toBe("href")
			expect(action.orig).toBe("http:///someplace")
		}
		expect(parsed_otf.text).toMatch(new RegExp("<a href=\"http:///someplace\">override</a>"))
	})
})
