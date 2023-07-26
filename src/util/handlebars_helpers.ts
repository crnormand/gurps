import { ItemType, Study, StudyType } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { getAdjustedStudyHours } from "./misc"
import { LocalizeGURPS } from "./localize"
import { CharacterGURPS, StaticSpell } from "@actor"
import { Static } from "@util"

class HandlebarsHelpersGURPS extends HandlebarsHelpers {
	static camelcase(s: string) {
		let n = ""
		for (const word of s.split(" ")) {
			n = `${n}<span class="first-letter">${word.substring(0, 1)}</span>${word.substring(1)} `
		}
		return n
	}

	static signed(n: number, replaceMinus = true) {
		if (replaceMinus) return n >= 0 ? `+${n}` : `${String(n).replace("-", "−")}`
		return n >= 0 ? `+${n}` : `${String(n)}`
	}

	static modifierString(n: number): string {
		return `${n < 0 ? "-" : "+"} ${Math.abs(n)}`
	}

	static abs(n: number) {
		return Math.abs(n)
	}

	// Return first argument which has a value
	static ror(...args: any[]) {
		for (const arg of args) {
			if (arg !== undefined) return arg
		}
		return ""
	}

	static sum(...args: any[]) {
		const arr: number[] = []
		for (const arg of args) {
			if (parseInt(arg)) arr.push(arg)
		}
		return arr.reduce((a, b) => a + b, 0)
	}

	static enabledList(a: any[]) {
		return a.filter(e => !e.system.disabled)
	}

	static notEmpty(a: any[] | any) {
		if (Array.isArray(a)) return !!a?.length
		return a ? Object.values(a).length > 0 : false
	}

	static blockLayout(blocks: string[], items: Record<string, any[]>): string {
		if (!blocks) return ""

		let outString = ""
		const line_length = 2

		for (const value of blocks) {
			let line = value
				.split(" ")
				.slice(0, line_length) // Get only first N items
				.filter(s => items[s].length || !["reactions", "conditional_modifiers", "melee", "ranged"].includes(s))
			if (!line.length) continue
			if (line_length > line.length) line = line.concat(Array(line_length - line.length).fill(line[0]))
			outString += `\n"${line.join(" ")}"`
		}

		outString += '\n"effects effects"'
		return outString
	}

	static json(a: any) {
		return JSON.stringify(a)
	}

	// Concat
	static cc(...args: any[]): string {
		return HandlebarsHelpers.concat(...(args as any)).toString()
	}

	static join(a: any[], s: string): string {
		if (!a || !a.length) return ""
		return a.join(s)
	}

	static arr(...args: any[]) {
		const outArr: any[] = []
		for (const arg of args) {
			if (arg && typeof arg !== "object") outArr.push(arg)
		}
		return outArr
	}

	// TODO: change to variable init and step

	static indent(i: number, type: "padding" | "text" = "padding", init = -6, step = 12): string {
		// Const init = -6
		// const step = 12
		let sum = init
		sum += step * i
		if (type === "text") return `style="text-indent: ${sum}px;"`
		return `style="padding-left: ${sum}px;"`
		// Return `style="padding-left: ${sum}px;"`
	}

	// static spellValues(i: Item): string {
	// 	const sp = i as any
	// 	const values = {
	// 		resist: sp.system.resist,
	// 		spell_class: sp.system.spell_class,
	// 		casting_cost: sp.system.casting_cost,
	// 		maintenance_cost: sp.system.maintenance_cost,
	// 		casting_time: sp.system.casting_time,
	// 		duration: sp.system.duration,
	// 		college: sp.system.college,
	// 	}
	// 	const list = []
	// 	for (const [k, v] of Object.entries(values)) {
	// 		if (v && v !== "-") list.push(`${game.i18n.localize(`gurps.character.spells.${k}`)}: ${v}`)
	// 	}
	// 	return list.join("; ")
	// }

	static date(str: string): string {
		const date = new Date(str)
		const options: any = {
			dateStyle: "medium",
			timeStyle: "short",
		}
		options.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
		return date.toLocaleString("en-US", options).replace(" at", ",")
	}

	// Lenght
	static len(...args: any[]): number {
		let length = 0
		for (const a of args) {
			if ((typeof a === "number" || typeof a === "string") && `${a}`.length > length) length = `${a}`.length
		}
		return length
	}

	static print(a: any): any {
		console.log(a)
		return ""
	}

	static format(a: string): string {
		return (a ? a : "").replace(/\n/g, "<br>")
	}

	static md(s: string): string {
		const showdown_options = {
			...CONST.SHOWDOWN_OPTIONS,
		}
		// @ts-ignore until v10 types
		Object.entries(showdown_options).forEach(([k, v]) => showdown.setOption(k, v))
		// @ts-ignore until v10 types
		const converter = new showdown.Converter()
		return converter.makeHtml(s)?.replace(/\s\+/g, "\r")
	}

	static ref(a: string): string {
		if (!a) return ""
		const references = a.split(",").map(e => {
			if (e.includes("http")) return [e, LocalizeGURPS.translations.gurps.character.link]
			return [e, e]
		})
		const buffer: string[] = []
		references.forEach(e => {
			buffer.push(`<div class="ref" data-pdf="${e[0]}">${e[1]}</div>`)
		})
		return buffer.join(",")
	}

	static adjustedStudyHours(entry: Study): number {
		return getAdjustedStudyHours(entry)
	}

	static in(total: string | any[] | any, sub: string): boolean {
		if (!total) total = ""
		if (Array.isArray(total)) return total.includes(sub)
		if (typeof total === "string") return total.includes(sub)
		return Object.keys(total).includes(sub)
		// Return total.includes(sub)
	}

	// May be temporary
	static diceString(d: DiceGURPS): string {
		// Console.log(d)
		return new DiceGURPS(d).stringExtra(false)
	}

	static sort(list: any[], key: string): any[] {
		return list.map(e => e).sort((a: any, b: any) => a[key] - b[key])
	}

	static textareaFormat(s: string | string[]): string {
		if (typeof s === "string") return s?.replaceAll("\t", "").replaceAll("\n", "\r") || ""
		else {
			return s?.join("\r") || ""
		}
	}

	// TODO: remove
	// static rollable(value: any): string {
	// 	return value ? "rollable" : ""
	// }

	// static displayDecimal(num: number | string, options: any) {
	// 	if (num != null) {
	// 		num = parseFloat(num.toString())

	// 		let places = options.hash?.number ?? 1
	// 		num = num.toFixed(places).toString()
	// 		if (options.hash?.removeZeros) {
	// 			while (num.toString().endsWith("0")) num = num.substring(0, num.length - 1)
	// 			if (num.toString().endsWith(".")) num = num.substring(0, num.length - 1)
	// 		}

	// 		if (parseFloat(num) < 0) return num.toString().replace("-", "&minus;")

	// 		if (options.hash?.forceSign && num.toString()[0] !== "+") return `+${num}`
	// 		return num.toString()
	// 	} else return "" // Null or undefined
	// }

	// static displayNumber(num: string, options: any) {
	// 	let showPlus = options.hash?.showPlus ?? false
	// 	if (num != null) {
	// 		if (parseInt(num) === 0) return showPlus ? "+0" : "0"
	// 		if (parseInt(num) < 0) return num.toString().replace("-", "&minus;")
	// 		if (options !== false && num.toString()[0] !== "+") return `+${num}`
	// 		return num.toString()
	// 	} else return "" // Null or undefined
	// }

	// static hpFpCondition(type: "HP" | "FP", value: any, attr: string) {
	// 	function _getConditionKey(pts: any, conditions: Record<string, any>) {
	// 		let found = "NORMAL"
	// 		for (const [key, value] of Object.entries(conditions)) {
	// 			if (pts && pts.value > value.breakpoint(pts)) {
	// 				return found
	// 			}
	// 			found = key
	// 		}
	// 		return found
	// 	}
	// 	function hpCondition(HP: any, member: string) {
	// 		let key = _getConditionKey(HP, staticHpConditions)
	// 		return (staticHpConditions as any)[key][member]
	// 	}
	// 	function fpCondition(this: any, FP: any, member: string) {
	// 		let key = _getConditionKey(FP, staticFpConditions)
	// 		return (staticFpConditions as any)[key][member]
	// 	}
	// 	if (type === "HP") return hpCondition(value, attr)
	// 	if (type === "FP") return fpCondition(value, attr)
	// 	throw new Error(`hpFpCondition called with invalid type: [${type}]`)
	// }

	// static resourceCondition(r: StaticResourceTracker): string {
	// 	// Let threshold = r.thresholds[0].condition
	// 	let threshold = ""
	// 	for (const t of r.thresholds) {
	// 		if (
	// 			(t.comparison === StaticThresholdComparison.LessThan && r.value < r.max * t.value) ||
	// 			(t.comparison === StaticThresholdComparison.LessThanOrEqual && r.value <= r.max * t.value) ||
	// 			(t.comparison === StaticThresholdComparison.GreaterThan && r.value > r.max * t.value) ||
	// 			(t.comparison === StaticThresholdComparison.GreaterThanOrEqual && r.value >= r.max * t.value)
	// 		) {
	// 			threshold = t.condition
	// 			break
	// 		}
	// 	}
	// 	return threshold
	// }

	// static optionSetStyle(boolean) {
	// 	return boolean ? "buttonpulsatingred" : "buttongrey"
	// }

	// static hpFpBreakpoints(_type: "HP" | "FP", _value: any, _options: any) {
	// 	return []
	// }

	// static inCombat(data) {
	// 	if (data.actor && game.combats?.active) {
	// 		return game.combats?.active?.combatants.contents
	// 			.map((it: Combatant) => it.actor?.id)
	// 			.includes(data?.actor?.id)
	// 	}
	// 	return false
	// }

	// static select_if(value, expected) {
	// 	return value === expected ? "selected" : ""
	// }

	// static include_if(condition, iftrue, iffalse) {
	// 	if (arguments.length === 3) iffalse = ""
	// 	return condition ? iftrue : iffalse
	// }

	// static hitlocationroll() {
	// 	let data = {}
	// 	// Flatlist(context, 0, '', data, false)
	// 	return data
	// }

	// static hitlocationpenalty() {
	// 	let data = {}
	// 	// Flatlist(context, 0, '', data, false)
	// 	return data
	// }

	static overspent(actor: CharacterGURPS) {
		return actor.unspentPoints < 0
	}

	// Static gmod() {
	// 	let data = {}
	// 	// Flatlist(context, 0, '', data, false)
	// 	return data
	// }

	// static staticBlockLayout(system: StaticCharacterSystemData) {
	// 	/**
	// 	 *
	// 	 * @param o
	// 	 */
	// 	function notEmpty(o: any) {
	// 		return o ? Object.values(o).length > 0 : false
	// 	}
	// 	const outAr = []
	// 	if (notEmpty(system.reactions) || notEmpty(system.conditionalmods)) {
	// 		if (!notEmpty(system.reactions)) outAr.push("conditional_modifiers conditional_modifiers")
	// 		else if (!notEmpty(system.conditionalmods)) outAr.push("reactions reactions")
	// 		else outAr.push("reactions conditional_modifiers")
	// 	}
	// 	if (notEmpty(system.melee)) outAr.push("melee melee")
	// 	if (notEmpty(system.ranged)) outAr.push("ranged ranged")
	// 	if (notEmpty(system.ads) || notEmpty(system.skills)) {
	// 		if (!notEmpty(system.ads)) outAr.push("skills skills")
	// 		else if (!notEmpty(system.skills)) outAr.push("traits traits")
	// 		else outAr.push("traits skills")
	// 	}
	// 	if (notEmpty(system.spells)) outAr.push("spells spells")

	// 	if (notEmpty(system.equipment?.carried)) outAr.push("equipment equipment")
	// 	if (notEmpty(system.equipment?.other)) outAr.push("other_equipment other_equipment")
	// 	if (notEmpty(system.notes)) outAr.push("notes notes")
	// 	return `"${outAr.join('" "')}";`
	// }

	static flatlist(context: any) {
		let data = {}
		Static.flatList(context, 0, "", data, false)
		return data
	}

	static staticSpellValues(i: StaticSpell): string {
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
			if (v && v !== "-") list.push(`${game.i18n.localize(`gurps.character.spells.${k}`)}: ${v}`)
		}
		return list.join("; ")
	}

	static modifierCost(c: { id: string; value: number }): string {
		return LocalizeGURPS.format(LocalizeGURPS.translations.gurps.system.modifier_bucket.cost, {
			value: c.value,
			id: c.id.toUpperCase(),
		})
	}

	static effective(a: Item | any): string {
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
	}

	static unsatisfied(reason: string): string {
		return (
			`<div class='unsatisfied' data-tooltip='${reason}' data-tooltip-direction='DOWN'>` +
			`<i class='gcs-triangle-exclamation'></i>${LocalizeGURPS.translations.gurps.prereqs.unsatisfied}` +
			"</div>"
		)
	}

	static overridden(check: any): string {
		return check ? "overridden" : ""
	}

	static studyinfo(type: StudyType) {
		const b = "• "
		const nl = "<br>"
		switch (type) {
			case StudyType.Self:
				return [
					b,
					LocalizeGURPS.format(LocalizeGURPS.translations.gurps.study.tooltip.max_no_job, { hours: 12 }),
					nl,
					b,
					LocalizeGURPS.format(LocalizeGURPS.translations.gurps.study.tooltip.max_part_time_job, {
						hours: 8,
					}),
					nl,
					b,
					LocalizeGURPS.format(LocalizeGURPS.translations.gurps.study.tooltip.max_full_time_job, {
						hours: 4,
					}),
				].join("")
			case StudyType.Job:
				return [
					b,
					LocalizeGURPS.format(LocalizeGURPS.translations.gurps.study.tooltip.max_full_time_job, {
						hours: 8,
					}),
					nl,
					b,
					LocalizeGURPS.format(LocalizeGURPS.translations.gurps.study.tooltip.max_part_time_job, {
						hours: 4,
					}),
				].join("")
			case StudyType.Teacher:
				return [
					b,
					LocalizeGURPS.format(LocalizeGURPS.translations.gurps.study.tooltip.max, { hours: 8 }),
					nl,
					b,
					LocalizeGURPS.translations.gurps.study.tooltip.teacher_prereq,
					nl,
					b,
					LocalizeGURPS.translations.gurps.study.tooltip.teacher_teaching,
				].join("")
			case StudyType.Intensive:
				return [
					b,
					LocalizeGURPS.format(LocalizeGURPS.translations.gurps.study.tooltip.max, { hours: 12 }),
					nl,
					b,
					LocalizeGURPS.translations.gurps.study.tooltip.teacher_prereq,
					nl,
					b,
					LocalizeGURPS.translations.gurps.study.tooltip.teacher_teaching,
				].join("")
		}
	}

	// Static multiselect(selected: string[], options: any) {
	// 	let html = options.fn(this)
	// 	if (selected.length === 0) {
	// 		const escapedValue = RegExp.escape(Handlebars.escapeExpression(
	// 			"all"
	// 		))
	// 		const rgx = new RegExp(' value=[\"\']' + escapedValue + '[\"\']')
	// 		html = html.replace(rgx, "$& selected")
	// 		return html
	// 	}
	// 	// if (selected.length > 1) {
	// 	// 	const escapedValue = RegExp.escape(Handlebars.escapeExpression(
	// 	// 		"multiple"
	// 	// 	))
	// 	// 	const rgx = new RegExp(' value=[\"\']' + escapedValue + '[\"\']')
	// 	// 	html = html.replace(rgx, "$& selected")
	// 	// 	for (const s of selected) {
	// 	// 		const escapedValue = RegExp.escape(Handlebars.escapeExpression(s))
	// 	// 		const rgx = new RegExp(' value=[\"\']' + escapedValue + '[\"\']')
	// 	// 		html = html.replace(rgx, "$& class='selected'")
	// 	// 	}
	// 	// 	return html
	// 	// }
	// 	for (const s of selected) {
	// 		const escapedValue = RegExp.escape(Handlebars.escapeExpression(s))
	// 		const rgx = new RegExp(' value=[\"\']' + escapedValue + '[\"\']')
	// 		html = html.replace(rgx, "$& class='selected'")
	// 	}
	// 	return html
	// }
}

export function registerHandlebarsHelpers() {
	Handlebars.registerHelper({
		camelcase: HandlebarsHelpersGURPS.camelcase,
		signed: HandlebarsHelpersGURPS.signed,
		modifierString: HandlebarsHelpersGURPS.modifierString,
		abs: HandlebarsHelpersGURPS.abs,
		ror: HandlebarsHelpersGURPS.ror,
		sum: HandlebarsHelpersGURPS.sum,
		enabledList: HandlebarsHelpersGURPS.enabledList,
		notEmpty: HandlebarsHelpersGURPS.notEmpty,
		blockLayout: HandlebarsHelpersGURPS.blockLayout,
		json: HandlebarsHelpersGURPS.json,
		concat: HandlebarsHelpersGURPS.cc,
		join: HandlebarsHelpersGURPS.join,
		arr: HandlebarsHelpersGURPS.arr,
		indent: HandlebarsHelpersGURPS.indent,
		// spellValues: HandlebarsHelpersGURPS.spellValues,
		date: HandlebarsHelpersGURPS.date,
		length: HandlebarsHelpersGURPS.len,
		print: HandlebarsHelpersGURPS.print,
		format: HandlebarsHelpersGURPS.format,
		md: HandlebarsHelpersGURPS.md,
		ref: HandlebarsHelpersGURPS.ref,
		in: HandlebarsHelpersGURPS.in,
		diceString: HandlebarsHelpersGURPS.diceString,
		sort: HandlebarsHelpersGURPS.sort,
		textareaFormat: HandlebarsHelpersGURPS.textareaFormat,
		overspent: HandlebarsHelpersGURPS.overspent,
		modifierCost: HandlebarsHelpersGURPS.modifierCost,
		effective: HandlebarsHelpersGURPS.effective,
		unsatisfied: HandlebarsHelpersGURPS.unsatisfied,
		overridden: HandlebarsHelpersGURPS.overridden,
		flatlist: HandlebarsHelpersGURPS.flatlist,
		staticSpellValues: HandlebarsHelpersGURPS.staticSpellValues,
		adjustedStudyHours: HandlebarsHelpersGURPS.adjustedStudyHours,
		studyinfo: HandlebarsHelpersGURPS.studyinfo,
		// Multiselect: HandlebarsHelpersGURPS.multiselect
	})
}

export { HandlebarsHelpersGURPS }
