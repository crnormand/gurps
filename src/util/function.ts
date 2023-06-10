// Import { SkillContainerGURPS, SkillGURPS, TechniqueGURPS, TraitGURPS } from "@item"
import { DiceGURPS } from "@module/dice"
import { equalFold } from "./misc"
import { ItemType } from "@module/data"
import { Length } from "./length"

export interface VariableResolver {
	resolveVariable: (variableName: string) => string
	traits: Collection<Item | any>
	skills: Collection<Item | any>
	isSkillLevelResolutionExcluded: (name: string, specialization: string) => boolean
	registerSkillLevelResolutionExclusion: (name: string, specialization: string) => void
	unregisterSkillLevelResolutionExclusion: (name: string, specialization: string) => void
	encumbranceLevel: (forSkills: boolean) => {
		level: number
		maximum_carry: number
		penalty: number
		name: string
	}
}

export interface Evaluator {
	evaluateNew: (expression: string) => any
	resolver: VariableResolver
}

export type eFunction = (e: Evaluator, a: string) => any

/**
 *
 */
export function evalFunctions(): Map<string, eFunction> {
	const m = new Map()
	m.set("abs", evalAbsolute)
	m.set("cbrt", evalCubeRoot)
	m.set("ceil", evalCeiling)
	m.set("exp", evalBaseEExpontential)
	m.set("exp2", evalBase2Expontential)
	m.set("floor", evalFloor)
	m.set("if", evalIf)
	m.set("log", evalNaturalLog)
	m.set("log1p", evalNaturalLogSum)
	m.set("log10", evalDecimalLog)
	m.set("max", evalMaximum)
	m.set("min", evalMinimum)
	m.set("round", evalRound)
	m.set("sqrt", evalSqrt)
	m.set("dice", evalDice)
	m.set("roll", evalRoll)
	m.set("advantage_level", evalTraitLevel)
	m.set("trait_level", evalTraitLevel)
	m.set("dice", evalDice)
	m.set("has_trait", evalHasTrait)
	m.set("random_height", evalRandomHeight)
	m.set("random_weight", evalRandomWeight)
	m.set("roll", evalRoll)
	m.set("signed", evalSigned)
	m.set("skill_level", evalSkillLevel)
	m.set("ssrt", evalSSRT)
	m.set("ssrt_to_yards", evalSSRTYards)
	m.set("enc", evalEncumbrance)
	return m
}

/**
 *
 * @param e
 * @param args
 */
function evalAbsolute(e: Evaluator, args: string): any {
	const value = evalToNumber(e, args)
	return Math.abs(value)
}

/**
 *
 * @param e
 * @param args
 */
function evalCubeRoot(e: Evaluator, args: string): any {
	const value = evalToNumber(e, args)
	return Math.cbrt(value)
}

/**
 *
 * @param e
 * @param args
 */
function evalCeiling(e: Evaluator, args: string): any {
	const value = evalToNumber(e, args)
	return Math.ceil(value)
}

/**
 *
 * @param e
 * @param args
 */
function evalBaseEExpontential(e: Evaluator, args: string): any {
	const value = evalToNumber(e, args)
	return Math.exp(value)
}

/**
 *
 * @param e
 * @param args
 */
function evalBase2Expontential(e: Evaluator, args: string): any {
	const value = evalToNumber(e, args)
	return 2 ** value
}

/**
 *
 * @param e
 * @param args
 */
function evalFloor(e: Evaluator, args: string): any {
	const value = evalToNumber(e, args)
	return Math.floor(value)
}

/**
 *
 * @param e
 * @param args
 */
function evalIf(e: Evaluator, args: string): any {
	let arg: string
	;[arg, args] = nextArg(args)
	const evaluated = e.evaluateNew(arg)
	const value = evalFrom(evaluated)
	if (value === 0) {
		;[, args] = nextArg(args)
	}
	;[arg] = nextArg(args)
	return e.evaluateNew(arg)
}

/**
 *
 * @param e
 * @param args
 */
function evalMaximum(e: Evaluator, args: string): any {
	let max = -Infinity
	while (args) {
		let arg: string
		;[arg, args] = nextArg(args)
		const value = evalToNumber(e, arg)
		max = Math.max(max, value)
	}
	return max
}

/**
 *
 * @param e
 * @param args
 */
function evalMinimum(e: Evaluator, args: string): any {
	let min: number = Math.min()
	while (args) {
		let arg: string
		;[arg, args] = nextArg(args)
		const value = evalToNumber(e, arg)
		min = Math.min(min, value)
	}
	return min
}

/**
 *
 * @param e
 * @param args
 */
function evalNaturalLog(e: Evaluator, args: string): any {
	const value = evalToNumber(e, args)
	return Math.log(value)
}

/**
 *
 * @param e
 * @param args
 */
function evalNaturalLogSum(e: Evaluator, args: string): any {
	const value = evalToNumber(e, args)
	return Math.log1p(value)
}

/**
 *
 * @param e
 * @param args
 */
function evalDecimalLog(e: Evaluator, args: string): any {
	const value = evalToNumber(e, args)
	return Math.log10(value)
}

/**
 *
 * @param e
 * @param args
 */
function evalRound(e: Evaluator, args: string): any {
	const value = evalToNumber(e, args)
	return Math.round(value)
}

/**
 *
 * @param e
 * @param args
 */
function evalSqrt(e: Evaluator, args: string): any {
	const value = evalToNumber(e, args)
	return Math.sqrt(value)
}

/**
 *
 * @param e
 * @param args
 */
function evalDice(e: Evaluator, args: string): any {
	const rollArgs: any = { sides: 6, count: 1, modifier: 1, multiplier: 1 }
	const argArray = []
	let arg: string
	while (args) {
		;[arg, args] = nextArg(args)
		argArray.push(e.evaluateNew(arg))
	}
	switch (rollArgs.length) {
		case 4:
			rollArgs.multiplier = argArray[3]
		case 3:
			rollArgs.modifier = argArray[2]
		case 2:
			rollArgs.count = argArray[1]
		case 1:
			rollArgs.sides = argArray[0]
	}
	const d = new DiceGURPS(rollArgs)
	return d.toString(true)
}

/**
 *
 * @param e
 * @param a
 */
function evalRoll(e: Evaluator, a: string): any {
	if (a.indexOf("(") !== -1) {
		a = evalToString(e, a)
	}
	return new DiceGURPS(a).roll(false)
}

/**
 *
 * @param e
 * @param a
 */
function evalToBool(e: Evaluator, a: any): boolean {
	const evaluated = e.evaluateNew(a)
	switch (typeof evaluated) {
		case "boolean":
			return evaluated
		case "number":
			return evaluated !== 0
		case "string":
			if (evaluated === "true") return true
			if (evaluated === "false") return false
			return false
		default:
			return false
	}
}

/**
 *
 * @param e
 * @param a
 */
function evalSigned(e: Evaluator, a: string): any {
	const n = evalToNumber(e, a)
	return n.signedString()
}

/**
 *
 * @param e
 * @param arg
 */
function evalSkillLevel(e: Evaluator, arg: string): any {
	const entity = e.resolver
	if (!entity) return 0
	let [name, remaining] = nextArg(arg)
	name = evalToString(e, name)
	if (!name) return 0
	name = name.trim()
	let specialization: string
	;[specialization, remaining] = nextArg(remaining)
	specialization = specialization.trim()
	if (!specialization || !evalToString(e, specialization)) return 0
	specialization = specialization.replaceAll('"', "")
	;[arg] = nextArg(remaining)
	arg = arg.trim()
	let relative = false
	if (arg) relative = evalToBool(e, arg)
	if (entity.isSkillLevelResolutionExcluded(name, specialization)) return 0
	entity.registerSkillLevelResolutionExclusion(name, specialization)
	let level = -Infinity
	entity.skills.forEach(s => {
		if (s.type === "skill_container") return
		if (level !== -Infinity) return
		if (equalFold(s.name || "", name) && equalFold(s.specialization, specialization)) {
			s.updateLevel()
			if (relative) level = s.level.relative_level
			else level = s.level.level
		}
	})
	entity.unregisterSkillLevelResolutionExclusion(name, specialization)
	return level
}

/**
 *
 * @param e
 * @param arg
 */
function evalToNumber(e: Evaluator, arg: string): number {
	const evaluated = e.evaluateNew(arg)
	return evalFrom(evaluated)
}

/**
 *
 * @param e
 * @param a
 */
export function evalToString(e: Evaluator, a: string): string {
	let evaluated: string | number | boolean
	try {
		evaluated = e.evaluateNew(a)
	} catch (err) {
		return ""
	}
	return String(evaluated)
}

export function evalEncumbrance(e: Evaluator, a: string): any {
	let [arg, remaining] = nextArg(a)
	const forSkills = evalToBool(e, arg)
	let returnFactor = false
	;[arg] = nextArg(remaining)
	if (arg.trim()) {
		returnFactor = evalToBool(e, remaining)
	}
	const entity = e.resolver
	if (!entity) return 0
	const level = entity.encumbranceLevel(forSkills).level
	if (returnFactor) return 1 - level / 5
	return level
}

export function evalHasTrait(e: Evaluator, a: string): any {
	const entity: VariableResolver | undefined = e.resolver
	if (!entity) return false
	const arg = a.replaceAll(/^['"]|[']$/g, "")
	return entity.traits.some(t => equalFold(t.name, arg))
}

export function evalTraitLevel(e: Evaluator, a: string): any {
	const entity: VariableResolver | undefined = e.resolver
	if (!entity) return -1
	const arg = a.replaceAll(/^['"]|[']$/g, "")
	let levels = -1
	;(entity as any).traits
		.filter((t: Item) => t.name === arg && t.type === ItemType.Trait)
		.every((t: Item | any) => {
			if (t.isLeveled) levels = t.levels
			return true
		})
	return levels
}

export function evalSSRT(e: Evaluator, a: string): any {
	let arg: string
	;[arg, a] = nextArg(a)
	const n = evalToString(e, arg)
	;[arg, a] = nextArg(a)
	const units = evalToString(e, arg)
	;[arg, a] = nextArg(a)
	const wantSize = evalToBool(e, arg)
	const length = Length.fromString(`${n} ${units}`)
	let result = yardsToValue(length, wantSize)
	if (!wantSize) {
		result = -result
	}
	return result
}

export function evalSSRTYards(e: Evaluator, a: string): any {
	const v = evalToNumber(e, a)
	return valueToYards(v)
}

function yardsToValue(length: number, allowNegative: boolean): number {
	const inches = Number(length)
	const feet = inches / 12
	let yards = inches / 36
	if (allowNegative) {
		if (inches <= 1 / 5) return -15
		else if (inches <= 1 / 3) return -14
		else if (inches <= 1 / 2) return -13
		else if (inches <= 2 / 3) return -12
		else if (inches <= 1) return -11
		else if (inches <= 1.5) return -10
		else if (inches <= 2) return -9
		else if (inches <= 3) return -8
		else if (inches <= 5) return -7
		else if (inches <= 8) return -6
		else if (feet <= 1) return -5
		else if (feet <= 1.5) return -4
		else if (feet <= 2) return -3
		else if (yards <= 1) return -2
		else if (yards < 1.5) return -1
	}
	if (yards <= 2) return 0
	let amt = 0
	while (yards > 10) {
		yards /= 10
		amt += 6
	}
	if (yards > 7) return amt + 4
	else if (yards > 5) return amt + 3
	else if (yards > 3) return amt + 2
	else if (yards > 2) return amt + 1
	else if (yards > 1.5) return amt
	else return amt - 1
}

/**
 *
 * @param value
 */
function valueToYards(value: number): number {
	if (value < -15) value = -15
	switch (value) {
		case -15:
			return 1 / 5 / 36
		case -14:
			return 1 / 3 / 36
		case -13:
			return 1 / 2 / 36
		case -12:
			return 2 / 3 / 36
		case -11:
			return 1 / 36
		case -10:
			return 1.5 / 36
		case -9:
			return 2 / 36
		case -8:
			return 3 / 36
		case -7:
			return 5 / 36
		case -6:
			return 8 / 36
		case -5:
			return 1 / 3
		case -4:
			return 1.5 / 3
		case -3:
			return 2 / 3
		case -2:
			return 1
		case -1:
			return 1.5
		case 0:
			return 2
		case 1:
			return 3
		case 2:
			return 5
		case 3:
			return 7
	}
	value -= 4
	let multiplier = 1
	for (let i = 0; i < value / 6; i++) multiplier *= 10
	let v = 0
	switch (value % 6) {
		case 0:
			v = 10
		case 1:
			v = 15
		case 2:
			v = 20
		case 3:
			v = 30
		case 4:
			v = 50
		case 5:
			v = 70
	}
	return v * multiplier
}

export function evalRandomHeight(e: Evaluator, a: string): any {
	const entity: VariableResolver | undefined = e.resolver
	if (!entity) return -1
	const stDecimal = evalToNumber(e, a)
	let base: number
	const st = Math.round(stDecimal)
	if (st < 7) base = 52
	else if (st > 13) base = 74
	else {
		switch (st) {
			case 7:
				base = 55
				break
			case 8:
				base = 58
				break
			case 9:
				base = 61
				break
			case 10:
				base = 63
				break
			case 11:
				base = 65
				break
			case 12:
				base = 68
				break
			case 13:
				base = 71
				break
			// this should never happen
			default:
				base = 0
				break
		}
	}
	return base + Math.round(Math.random() * 10)
}

export function evalRandomWeight(e: Evaluator, a: string): any {
	const entity: VariableResolver | undefined = e.resolver
	if (!entity) return -1
	let arg: string
	;[arg, a] = nextArg(a)
	let stDecimal = evalToNumber(e, arg)
	let shift = 0
	if (arg !== "") shift = evalToNumber(e, a)
	if (isNaN(shift)) return null
	let st = Math.round(stDecimal)
	let skinny = false
	let overweight = false
	let fat = false
	let veryFat = false
	entity.traits.forEach(t => {
		if (!t.enabled) return
		if (equalFold(t.name, "skinny")) skinny = true
		else if (equalFold(t.name, "overweight")) overweight = true
		else if (equalFold(t.name, "fat")) fat = true
		else if (equalFold(t.name, "very fat")) veryFat = true
	})
	let shiftAmt = Math.round(shift)
	if (shiftAmt != 0) {
		if (skinny) shiftAmt -= 1
		else if (overweight) shiftAmt += 1
		else if (fat) shiftAmt += 2
		else if (veryFat) shiftAmt += 3
		skinny = false
		overweight = false
		fat = false
		veryFat = false
		switch (shiftAmt) {
			case 0:
				break
			case 1:
				overweight = true
				break
			case 2:
				fat = true
				break
			case 3:
				veryFat = true
				break
			default:
				if (shiftAmt < 0) skinny = true
				else veryFat = true
		}
	}
	let [lower, upper] = [0, 0]
	switch (true) {
		case skinny:
			if (st < 7) [lower, upper] = [40, 80]
			else if (st > 13) [lower, upper] = [115, 180]
			else
				switch (st) {
					case 7:
						;[lower, upper] = [50, 90]
						break
					case 8:
						;[lower, upper] = [60, 100]
						break
					case 9:
						;[lower, upper] = [70, 110]
						break
					case 10:
						;[lower, upper] = [80, 120]
						break
					case 11:
						;[lower, upper] = [85, 130]
						break
					case 12:
						;[lower, upper] = [95, 150]
						break
					case 13:
						;[lower, upper] = [105, 165]
						break
				}
			break
		case overweight:
			if (st < 7) [lower, upper] = [80, 160]
			else if (st > 13) [lower, upper] = [225, 355]
			else
				switch (st) {
					case 7:
						;[lower, upper] = [100, 175]
						break
					case 8:
						;[lower, upper] = [120, 195]
						break
					case 9:
						;[lower, upper] = [140, 215]
						break
					case 10:
						;[lower, upper] = [150, 230]
						break
					case 11:
						;[lower, upper] = [165, 255]
						break
					case 12:
						;[lower, upper] = [185, 290]
						break
					case 13:
						;[lower, upper] = [205, 320]
						break
				}
			break
		case fat:
			if (st < 7) [lower, upper] = [90, 180]
			else if (st > 13) [lower, upper] = [255, 405]
			else
				switch (st) {
					case 7:
						;[lower, upper] = [115, 205]
						break
					case 8:
						;[lower, upper] = [135, 225]
						break
					case 9:
						;[lower, upper] = [160, 250]
						break
					case 10:
						;[lower, upper] = [175, 265]
						break
					case 11:
						;[lower, upper] = [190, 295]
						break
					case 12:
						;[lower, upper] = [210, 330]
						break
					case 13:
						;[lower, upper] = [235, 370]
						break
				}
			break
		case veryFat:
			if (st < 7) [lower, upper] = [120, 240]
			else if (st > 13) [lower, upper] = [340, 540]
			else
				switch (st) {
					case 7:
						;[lower, upper] = [150, 270]
						break
					case 8:
						;[lower, upper] = [180, 300]
						break
					case 9:
						;[lower, upper] = [210, 330]
						break
					case 10:
						;[lower, upper] = [230, 350]
						break
					case 11:
						;[lower, upper] = [250, 390]
						break
					case 12:
						;[lower, upper] = [280, 440]
						break
					case 13:
						;[lower, upper] = [310, 490]
						break
				}
			if (shiftAmt > 3) {
				const delta = (upper - lower) * (2 / 3)
				lower += delta
				upper += delta
			}
			break
		default:
			if (st < 7) [lower, upper] = [60, 120]
			else if (st > 13) [lower, upper] = [170, 270]
			else
				switch (st) {
					case 7:
						;[lower, upper] = [75, 135]
						break
					case 8:
						;[lower, upper] = [90, 150]
						break
					case 9:
						;[lower, upper] = [105, 165]
						break
					case 10:
						;[lower, upper] = [115, 175]
						break
					case 11:
						;[lower, upper] = [125, 195]
						break
					case 12:
						;[lower, upper] = [140, 220]
						break
					case 13:
						;[lower, upper] = [155, 245]
						break
				}
	}
	return lower + Math.round(Math.random() * (1 + upper - lower))
}

function evalFrom(arg: any): number {
	const a = typeof arg
	switch (a) {
		case "boolean":
			if (arg) return 1
			return 0
		case "number":
			return arg
		case "string":
			return parseFloat(arg)
		default:
			throw new Error(`Not a number: ${arg}`)
	}
}

/**
 *
 * @param args
 */
function nextArg(args: string): [string, string] {
	let parens = 0
	for (let i = 0; i < args.length; i++) {
		const ch = args[i]
		if (ch === "(") parens++
		else if (ch === ")") parens--
		else if (ch === "," && parens === 0) return [args.substring(0, i), args.substring(i + 1)]
	}
	return [args, ""]
}
