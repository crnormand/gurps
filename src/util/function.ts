// Import { SkillContainerGURPS, SkillGURPS, TechniqueGURPS, TraitGURPS } from "@item"
import { DiceGURPS } from "@module/dice"
import { equalFold } from "./misc"
import * as Measure from "./measure"

export interface VariableResolver {
	resolveVariable: (variableName: string) => string
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

/**
 *
 * @param e
 * @param a
 */
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

/**
 *
 * @param e
 * @param a
 */
export function evalTraitLevel(e: Evaluator, a: string): any {
	const entity: VariableResolver | undefined = e.resolver
	if (!entity) return -1
	const arg = a.replaceAll(/^['"]|[']$/g, "")
	let levels = -1
	;(entity as any).traits
		.filter((t: Item) => t.name === arg && t.type === "trait")
		.every((t: Item | any) => {
			if (t.isLeveled) levels = t.levels
			return true
		})
	return levels
}

/**
 *
 * @param e
 * @param a
 */
export function evalSSRT(e: Evaluator, a: string): any {
	let arg: string
	;[arg, a] = nextArg(a)
	const n = evalToString(e, arg)
	;[arg, a] = nextArg(a)
	const units = evalToString(e, arg)
	;[arg, a] = nextArg(a)
	const wantSize = evalToBool(e, arg)
	const length = Measure.lengthFromString(`${n} ${units}`, Measure.LengthUnits.Yard)
	let result = yardsToValue(length, wantSize)
	if (!wantSize) {
		result = -result
	}
	return result
}

/**
 *
 * @param e
 * @param a
 */
export function evalSSRTYards(e: Evaluator, a: string): any {
	const v = evalToNumber(e, a)
	return valueToYards(v)
}

/**
 *
 * @param length
 * @param allowNegative
 */
function yardsToValue(length: Measure.Length, allowNegative: boolean): number {
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

/**
 *
 * @param arg
 */
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
