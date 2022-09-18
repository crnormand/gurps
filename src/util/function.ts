import { DiceGURPS } from "@module/dice";
import { Evaluator } from "@util";

type eFunction = (evaluator: Evaluator | null, options: string) => [any, Error];

/**
 *
 */
export function fixedFunctions(): Map<string, eFunction> {
	const m = new Map();
	m.set("abs", fixedAbsolute);
	m.set("cbrt", fixedCubeRoot);
	m.set("ceil", fixedCeiling);
	m.set("exp", fixedBaseEExpontential);
	m.set("exp2", fixedBase2Expontential);
	m.set("floor", fixedFloor);
	m.set("if", fixedIf);
	m.set("log", fixedNaturalLog);
	m.set("log1p", fixedNaturalLogSum);
	m.set("log10", fixedDecimalLog);
	m.set("max", fixedMaximum);
	m.set("min", fixedMinimum);
	m.set("round", fixedRound);
	m.set("sqrt", fixedSqrt);
	m.set("dice", fixedDice);
	m.set("roll", fixedRoll);
	return m;
}

/**
 *
 * @param e
 * @param args
 */
function fixedAbsolute(e: Evaluator, args: string): any {
	const value = evalToFixed(e, args);
	return Math.abs(value);
}

/**
 *
 * @param e
 * @param args
 */
function fixedCubeRoot(e: Evaluator, args: string): any {
	const value = evalToFixed(e, args);
	return Math.cbrt(value);
}

/**
 *
 * @param e
 * @param args
 */
function fixedCeiling(e: Evaluator, args: string): any {
	const value = evalToFixed(e, args);
	return Math.ceil(value);
}

/**
 *
 * @param e
 * @param args
 */
function fixedBaseEExpontential(e: Evaluator, args: string): any {
	const value = evalToFixed(e, args);
	return Math.exp(value);
}

/**
 *
 * @param e
 * @param args
 */
function fixedBase2Expontential(e: Evaluator, args: string): any {
	const value = evalToFixed(e, args);
	return 2 ** value;
}

/**
 *
 * @param e
 * @param args
 */
function fixedFloor(e: Evaluator, args: string): any {
	const value = evalToFixed(e, args);
	return Math.floor(value);
}

/**
 *
 * @param e
 * @param args
 */
function fixedIf(e: Evaluator, args: string): any {
	let arg: string;
	[arg, args] = nextArg(args);
	const evaluated = e.evaluateNew(arg);
	const value = fixedFrom(evaluated);
	if (value === 0) {
		[, args] = nextArg(args);
	}
	[arg] = nextArg(args);
	return e.evaluateNew(arg);
}

/**
 *
 * @param e
 * @param args
 */
function fixedMaximum(e: Evaluator, args: string): any {
	let max: number = Math.max();
	while (args) {
		let arg: string;
		[arg, args] = nextArg(args);
		const value = evalToFixed(e, arg);
		max = Math.max(max, value);
	}
	return max;
}

/**
 *
 * @param e
 * @param args
 */
function fixedMinimum(e: Evaluator, args: string): any {
	let min: number = Math.min();
	while (args) {
		let arg: string;
		[arg, args] = nextArg(args);
		const value = evalToFixed(e, arg);
		min = Math.min(min, value);
	}
	return min;
}

/**
 *
 * @param e
 * @param args
 */
function fixedNaturalLog(e: Evaluator, args: string): any {
	const value = evalToFixed(e, args);
	return Math.log(value);
}

/**
 *
 * @param e
 * @param args
 */
function fixedNaturalLogSum(e: Evaluator, args: string): any {
	const value = evalToFixed(e, args);
	return Math.log1p(value);
}

/**
 *
 * @param e
 * @param args
 */
function fixedDecimalLog(e: Evaluator, args: string): any {
	const value = evalToFixed(e, args);
	return Math.log10(value);
}

/**
 *
 * @param e
 * @param args
 */
function fixedRound(e: Evaluator, args: string): any {
	const value = evalToFixed(e, args);
	return Math.round(value);
}

/**
 *
 * @param e
 * @param args
 */
function fixedSqrt(e: Evaluator, args: string): any {
	const value = evalToFixed(e, args);
	return Math.sqrt(value);
}

/**
 *
 * @param e
 * @param args
 */
function fixedDice(e: Evaluator, args: string): any {
	const rollArgs: any = { sides: 6, count: 1, modifier: 1, multiplier: 1 };
	const argArray = [];
	let arg: string;
	while (args) {
		[arg, args] = nextArg(args);
		argArray.push(fixedFrom(e.evaluateNew(arg)));
	}
	switch (rollArgs.length) {
		case 4:
			rollArgs.multiplier = argArray[3];
		case 3:
			rollArgs.modifier = argArray[2];
		case 2:
			rollArgs.count = argArray[1];
		case 1:
			rollArgs.sides = argArray[0];
	}
	const d = new DiceGURPS(rollArgs);
	return d.toString(true);
}

/**
 *
 * @param e
 * @param args
 */
function fixedRoll(e: Evaluator, args: string): any {
	const d = new DiceGURPS(args);
	const r = Roll.create(d.toString(true));
	r.evaluate({ async: false });
	return r.total;
}

/**
 *
 * @param e
 * @param arg
 */
function evalToFixed(e: Evaluator, arg: string): number {
	const evaluated = e.evaluateNew(arg);
	return fixedFrom(evaluated);
}

/**
 *
 * @param arg
 */
function fixedFrom(arg: any): number {
	const a = typeof arg;
	switch (a) {
		case "boolean":
			if (arg) return 1;
			return 0;
		case "number":
			return arg;
		case "string":
			return parseFloat(arg);
		default:
			throw new Error(`Not a number: ${arg}`);
	}
}

/**
 *
 * @param args
 */
function nextArg(args: string): [string, string] {
	let parens = 0;
	for (let i = 0; i < args.length; i++) {
		const ch = args[i];
		if (ch === "(") parens++;
		else if (ch === ")") parens--;
		else if (ch === "," && parens === 0) return [args.substring(0, i), args.substring(i + 1)];
	}
	return [args, ""];
}
