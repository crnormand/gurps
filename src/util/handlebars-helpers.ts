import { CharacterGURPS } from "@actor"
import { StaticSpell } from "@actor/static_character/components"
import {
	StaticCharacterSystemData,
	StaticResourceTracker,
	StaticThresholdComparison,
} from "@actor/static_character/data"
import { staticFpConditions, staticHpConditions } from "@module/constants"
import { ItemType, Study } from "@module/data"
import { DiceGURPS } from "@module/dice"
import * as Static from "./static"
import { getAdjustedStudyHours, i18n, i18n_f } from "./misc"

/**
 *
 */
export function registerHandlebarsHelpers() {
	Handlebars.registerHelper("concat", function (...args) {
		let outStr = ""
		for (const arg of args) {
			if (typeof arg !== "object") outStr += arg
		}
		return outStr
	})

	Handlebars.registerHelper("camelcase", function (s) {
		let n = ""
		for (const word of s.split(" ")) {
			n = `${n}<span class="first-letter">${word.substring(0, 1)}</span>${word.substring(1)} `
		}
		return n
	})

	Handlebars.registerHelper("input_lock", function (b: boolean) {
		return b ? "" : "disabled"
	})

	Handlebars.registerHelper("signed", function (n: number, replaceMinus = true) {
		if (replaceMinus) return n >= 0 ? `+${n}` : `${String(n).replace("-", "−")}`
		return n >= 0 ? `+${n}` : `${String(n)}`
	})

	Handlebars.registerHelper("modifierString", function (n: number): string {
		return `${n < 0 ? "-" : "+"} ${Math.abs(n)}`
	})

	Handlebars.registerHelper("abs", function (n: number) {
		return Math.abs(n)
	})

	Handlebars.registerHelper("or", function (...args) {
		let val = false
		for (const arg of args) {
			if (arg && typeof arg !== "object") val = true
			if (Array.isArray(arg) && arg.length) val = true
		}
		return val
	})

	// Return first argument which has a value
	Handlebars.registerHelper("ror", function (...args) {
		for (const arg of args) {
			if (arg !== undefined) return arg
		}
		return ""
	})

	Handlebars.registerHelper("and", function (...args) {
		let val = true
		for (const arg of args) {
			if (!arg && typeof arg !== "object") val = false
		}
		return val
	})

	Handlebars.registerHelper("eq", function (a, b) {
		return a === b
	})

	Handlebars.registerHelper("neq", function (a, b) {
		return a !== b
	})

	Handlebars.registerHelper("gt", function (a, b) {
		return a > b
	})

	Handlebars.registerHelper("sum", function (...args) {
		const arr: number[] = []
		for (const arg of args) {
			if (parseInt(arg)) arr.push(arg)
		}
		return arr.reduce((a, b) => a + b, 0)
	})

	Handlebars.registerHelper("enabledList", function (a: any[]) {
		return a.filter(e => !e.system.disabled)
	})

	Handlebars.registerHelper("notEmpty", function (a: any[] | any) {
		if (Array.isArray(a)) return !!a?.length
		return a ? Object.values(a).length > 0 : false
	})

	Handlebars.registerHelper("blockLayout", function (a: Array<string>, items: any) {
		if (!a) return ""
		let outStr = ""
		let line_length = 2
		for (const value of a) {
			let line = value.split(" ")
			if (line.length > line_length) line_length = line.length
			// Line = line.filter((e: string) => !!items[e]?.length)
			if (line.length) {
				if (line_length > line.length) line = line.concat(Array(line_length - line.length).fill(line[0]))
				outStr += `\n"${line.join(" ")}"`
			}
		}
		return outStr
	})

	Handlebars.registerHelper("json", function (a: any) {
		return JSON.stringify(a)
	})

	Handlebars.registerHelper("not", function (a: any) {
		return !a
	})

	Handlebars.registerHelper("join", function (a: any[], s: string): string {
		if (!a || !a.length) return ""
		return a.join(s)
	})

	Handlebars.registerHelper("arr", function (...args) {
		const outArr: any[] = []
		for (const arg of args) {
			if (arg && typeof arg !== "object") outArr.push(arg)
		}
		return outArr
	})

	// TODO: change to variable init and step
	Handlebars.registerHelper(
		"indent",
		function (i: number, type: "padding" | "text" = "padding", init = -6, step = 12): string {
			// Const init = -6
			// const step = 12
			let sum = init
			sum += step * i
			if (type === "text") return `style="text-indent: ${sum}px;"`
			return `style="padding-left: ${sum}px;"`
			// Return `style="padding-left: ${sum}px;"`
		}
	)

	Handlebars.registerHelper("spellValues", function (i: Item): string {
		const sp = i as any
		const values = {
			resist: sp.system.resist,
			spell_class: sp.system.spell_class,
			casting_cost: sp.system.casting_cost,
			maintenance_cost: sp.system.maintenance_cost,
			casting_time: sp.system.casting_time,
			duration: sp.system.duration,
			college: sp.system.college,
		}
		const list = []
		for (const [k, v] of Object.entries(values)) {
			if (v && v !== "-") list.push(`${i18n(`gurps.character.spells.${k}`)}: ${v}`)
		}
		return list.join("; ")
	})

	Handlebars.registerHelper("disabled", function (a: boolean): string {
		if (a) return "disabled"
		return ""
	})

	Handlebars.registerHelper("date", function (str: string): string {
		const date = new Date(str)
		const options: any = {
			dateStyle: "medium",
			timeStyle: "short",
		}
		options.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
		return date.toLocaleString("en-US", options).replace(" at", ",")
	})

	Handlebars.registerHelper("length", function (...args: any[]): number {
		let length = 0
		for (const a of args) {
			if ((typeof a === "number" || typeof a === "string") && `${a}`.length > length) length = `${a}`.length
		}
		return length
	})

	Handlebars.registerHelper("print", function (a: any): any {
		console.log(a)
		return ""
	})

	Handlebars.registerHelper("format", function (a: string): string {
		return (a ? a : "").replace(/\n/g, "<br>")
	})

	Handlebars.registerHelper("ref", function (a: string): string {
		if (!a) return ""
		const references = a.split(",").map(e => {
			if (e.includes("http")) return [e, i18n("gurps.character.link")]
			return [e, e]
		})
		const buffer: string[] = []
		references.forEach(e => {
			buffer.push(`<div class="ref" data-pdf="${e[0]}">${e[1]}</div>`)
		})
		return buffer.join(",")
	})

	Handlebars.registerHelper("adjustedStudyHours", function (entry: Study): number {
		return getAdjustedStudyHours(entry)
	})

	Handlebars.registerHelper("in", function (total: string | any[] | any, sub: string): boolean {
		if (!total) total = ""
		if (Array.isArray(total)) return total.includes(sub)
		if (typeof total === "string") return total.includes(sub)
		return Object.keys(total).includes(sub)
		// Return total.includes(sub)
	})

	// May be temporary
	Handlebars.registerHelper("diceString", function (d: DiceGURPS): string {
		return new DiceGURPS(d).stringExtra(false)
	})

	Handlebars.registerHelper("sort", function (list: any[], key: string): any[] {
		return list.map(e => e).sort((a: any, b: any) => a[key] - b[key])
	})

	Handlebars.registerHelper("json", function (o: any): string {
		return JSON.stringify(o)
	})

	Handlebars.registerHelper("textareaFormat", function (s: string | string[]): string {
		if (typeof s === "string") return s?.replaceAll("\t", "").replaceAll("\n", "\r") || ""
		else {
			return s?.join("\r") || ""
		}
	})

	// TODO: remove
	Handlebars.registerHelper("rollable", function (value: any): string {
		return value ? "rollable" : ""
	})

	Handlebars.registerHelper("displayDecimal", function (num, options) {
		if (num != null) {
			num = parseFloat(num.toString())

			let places = options.hash?.number ?? 1
			num = num.toFixed(places).toString()
			if (options.hash?.removeZeros) {
				while (num.toString().endsWith("0")) num = num.substr(0, num.length - 1)
				if (num.toString().endsWith(".")) num = num.substr(0, num.length - 1)
			}

			if (parseFloat(num) < 0) return num.toString().replace("-", "&minus;")

			if (options.hash?.forceSign && num.toString()[0] !== "+") return `+${num}`
			return num.toString()
		} else return "" // Null or undefined
	})

	Handlebars.registerHelper("displayNumber", function (num, options) {
		let showPlus = options.hash?.showPlus ?? false
		if (num != null) {
			if (parseInt(num) === 0) return showPlus ? "+0" : "0"
			if (parseInt(num) < 0) return num.toString().replace("-", "&minus;")
			if (options !== false && num.toString()[0] !== "+") return `+${num}`
			return num.toString()
		} else return "" // Null or undefined
	})

	Handlebars.registerHelper("hpFpCondition", function (type: "HP" | "FP", value: any, attr: string) {
		/**
		 *
		 * @param pts
		 * @param conditions
		 */
		function _getConditionKey(pts: any, conditions: Record<string, any>) {
			let found = "NORMAL"
			for (const [key, value] of Object.entries(conditions)) {
				if (pts && pts.value > value.breakpoint(pts)) {
					return found
				}
				found = key
			}
			return found
		}
		/**
		 *
		 * @param HP
		 * @param member
		 */
		function hpCondition(HP: any, member: string) {
			let key = _getConditionKey(HP, staticHpConditions)
			return (staticHpConditions as any)[key][member]
		}
		/**
		 *
		 * @param this
		 * @param FP
		 * @param member
		 */
		function fpCondition(this: any, FP: any, member: string) {
			let key = _getConditionKey(FP, staticFpConditions)
			return (staticFpConditions as any)[key][member]
		}
		if (type === "HP") return hpCondition(value, attr)
		if (type === "FP") return fpCondition(value, attr)
		throw new Error(`hpFpCondition called with invalid type: [${type}]`)
	})

	Handlebars.registerHelper("resourceCondition", function (r: StaticResourceTracker): string {
		// Let threshold = r.thresholds[0].condition
		let threshold = ""
		for (const t of r.thresholds) {
			if (
				(t.comparison === StaticThresholdComparison.LessThan && r.value < r.max * t.value) ||
				(t.comparison === StaticThresholdComparison.LessThanOrEqual && r.value <= r.max * t.value) ||
				(t.comparison === StaticThresholdComparison.GreaterThan && r.value > r.max * t.value) ||
				(t.comparison === StaticThresholdComparison.GreaterThanOrEqual && r.value >= r.max * t.value)
			) {
				threshold = t.condition
				break
			}
		}
		return threshold
	})

	Handlebars.registerHelper("optionSetStyle", function (boolean) {
		return boolean ? "buttonpulsatingred" : "buttongrey"
	})

	Handlebars.registerHelper("hpFpBreakpoints", function (type: "HP" | "FP", value: any, options: any) {
		return []
	})

	Handlebars.registerHelper("inCombat", function (data) {
		if (data.actor && game.combats?.active) {
			return game.combats?.active?.combatants.contents
				.map((it: Combatant) => it.actor?.id)
				.includes(data?.actor?.id)
		}
		return false
	})

	Handlebars.registerHelper("select-if", function (value, expected) {
		return value === expected ? "selected" : ""
	})

	Handlebars.registerHelper("include-if", function (condition, iftrue, iffalse) {
		if (arguments.length === 3) iffalse = ""
		return condition ? iftrue : iffalse
	})

	Handlebars.registerHelper("hitlocationroll", function () {
		let data = {}
		// Flatlist(context, 0, '', data, false)
		return data
	})

	Handlebars.registerHelper("hitlocationpenalty", function () {
		let data = {}
		// Flatlist(context, 0, '', data, false)
		return data
	})

	Handlebars.registerHelper("overspent", function (actor: CharacterGURPS) {
		return actor.unspentPoints < 0
	})

	Handlebars.registerHelper("gmod", function () {
		let data = {}
		// Flatlist(context, 0, '', data, false)
		return data
	})

	Handlebars.registerHelper("staticBlockLayout", function (system: StaticCharacterSystemData) {
		/**
		 *
		 * @param o
		 */
		function notEmpty(o: any) {
			return o ? Object.values(o).length > 0 : false
		}
		const outAr = []
		if (notEmpty(system.reactions) || notEmpty(system.conditionalmods)) {
			if (!notEmpty(system.reactions)) outAr.push("conditional_modifiers conditional_modifiers")
			else if (!notEmpty(system.conditionalmods)) outAr.push("reactions reactions")
			else outAr.push("reactions conditional_modifiers")
		}
		if (notEmpty(system.melee)) outAr.push("melee melee")
		if (notEmpty(system.ranged)) outAr.push("ranged ranged")
		if (notEmpty(system.ads) || notEmpty(system.skills)) {
			if (!notEmpty(system.ads)) outAr.push("skills skills")
			else if (!notEmpty(system.skills)) outAr.push("traits traits")
			else outAr.push("traits skills")
		}
		if (notEmpty(system.spells)) outAr.push("spells spells")

		if (notEmpty(system.equipment?.carried)) outAr.push("equipment equipment")
		if (notEmpty(system.equipment?.other)) outAr.push("other_equipment other_equipment")
		if (notEmpty(system.notes)) outAr.push("notes notes")
		return `"${outAr.join('" "')}";`
	})

	Handlebars.registerHelper("flatlist", function (context) {
		let data = {}
		Static.flatList(context, 0, "", data, false)
		return data
	})

	Handlebars.registerHelper("staticSpellValues", function (i: StaticSpell): string {
		const values = {
			resist: i.resist,
			spell_class: i.class,
			casting_cost: i.cost,
			maintenance_cost: i.maintain,
			casting_time: i.casttime,
			duration: i.duration,
			college: i.college,
		}
		const list = []
		for (const [k, v] of Object.entries(values)) {
			if (v && v !== "-") list.push(`${i18n(`gurps.character.spells.${k}`)}: ${v}`)
		}
		return list.join("; ")
	})

	Handlebars.registerHelper("modifierCost", function (c: { id: string; value: number }): string {
		return i18n_f("gurps.system.modifier_bucket.cost", { value: c.value, id: c.id.toUpperCase() })
	})

	Handlebars.registerHelper("effective", function (a: Item | any): string {
		if (a instanceof Item) {
			if (a.type === ItemType.Skill) {
				const sk = a as any
				if (sk.effectiveLevel > sk.level.level) return "pos"
				if (sk.effectiveLevel < sk.level.level) return "neg"
			}
		}
		if (a.effective && a.current) {
			if (a.effective > a.current) return "pos"
			if (a.effective < a.current) return "neg"
		}
		return ""
	})

	Handlebars.registerHelper("unsatisfied", function (reason: string): string {
		return (
			`<div class='unsatisfied' data-tooltip='${reason}' data-tooltip-direction='DOWN'>` +
			`<i class='gcs-triangle-exclamation'></i>${i18n("gurps.prereqs.unsatisfied")}` +
			"</div>"
		)
	})
}
