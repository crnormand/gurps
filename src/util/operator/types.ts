export type opFunction = (left: any, right: any) => any;

export type unaryOpFunction = (arg: any) => any;

export interface OperatorDef {
	symbol: string;
	precedence?: number;
	evaluate?: opFunction;
	evaluateUnary?: unaryOpFunction;
}

export class Operator {
	symbol: string;

	precedence?: number;

	evaluate?: opFunction;

	evaluateUnary?: unaryOpFunction;

	constructor(data: OperatorDef) {
		this.symbol = data.symbol;
		this.precedence = data.precedence;
		this.evaluate = data.evaluate;
		this.evaluateUnary = data.evaluateUnary;
	}

	match(expression: string, start: number, max: number): boolean {
		if (max - start < this.symbol.length) return false;
		const matches = this.symbol === expression.substring(start, start + this.symbol.length);
		if (
			matches &&
			this.symbol.length === 1 &&
			this.symbol === "-" &&
			start > 1 &&
			expression.substring(start - 1, start) === "e"
		) {
			const ch = expression.split("")[start - 2];
			if (!isNaN(parseFloat(ch))) return false;
		}
		return matches;
	}
}

/**
 *
 */
export function openParen(): Operator {
	return new Operator({ symbol: "(" });
}

/**
 *
 */
export function closeParen(): Operator {
	return new Operator({ symbol: ")" });
}

/**
 *
 * @param f
 */
export function not(f: unaryOpFunction): Operator {
	return new Operator({
		symbol: "!",
		evaluateUnary: f,
	});
}

/**
 *
 * @param f
 */
export function logicalOr(f: opFunction): Operator {
	return new Operator({
		symbol: "||",
		precedence: 10,
		evaluate: f,
	});
}

/**
 *
 * @param f
 */
export function logicalAnd(f: opFunction): Operator {
	return new Operator({
		symbol: "&&",
		precedence: 20,
		evaluate: f,
	});
}

/**
 *
 * @param f
 */
export function equal(f: opFunction): Operator {
	return new Operator({
		symbol: "==",
		precedence: 30,
		evaluate: f,
	});
}

/**
 *
 * @param f
 */
export function notEqual(f: opFunction): Operator {
	return new Operator({
		symbol: "!=",
		precedence: 40,
		evaluate: f,
	});
}

/**
 *
 * @param f
 */
export function greaterThan(f: opFunction): Operator {
	return new Operator({
		symbol: ">",
		precedence: 40,
		evaluate: f,
	});
}

/**
 *
 * @param f
 */
export function greaterThanOrEqual(f: opFunction): Operator {
	return new Operator({
		symbol: ">=",
		precedence: 40,
		evaluate: f,
	});
}

/**
 *
 * @param f
 */
export function lessThan(f: opFunction): Operator {
	return new Operator({
		symbol: "<",
		precedence: 40,
		evaluate: f,
	});
}

/**
 *
 * @param f
 */
export function lessThanOrEqual(f: opFunction): Operator {
	return new Operator({
		symbol: "<=",
		precedence: 40,
		evaluate: f,
	});
}

/**
 *
 * @param f
 * @param unary
 */
export function add(f: opFunction, unary: unaryOpFunction): Operator {
	return new Operator({
		symbol: "+",
		precedence: 50,
		evaluate: f,
		evaluateUnary: unary,
	});
}

/**
 *
 * @param f
 * @param unary
 */
export function subtract(f: opFunction, unary: unaryOpFunction): Operator {
	return new Operator({
		symbol: "-",
		precedence: 50,
		evaluate: f,
		evaluateUnary: unary,
	});
}
/**
 *
 * @param f
 */
export function multiply(f: opFunction): Operator {
	return new Operator({
		symbol: "*",
		evaluate: f,
		precedence: 60,
	});
}

/**
 *
 * @param f
 */
export function divide(f: opFunction): Operator {
	return new Operator({
		symbol: "/",
		precedence: 60,
		evaluate: f,
	});
}

/**
 *
 * @param f
 */
export function modulo(f: opFunction): Operator {
	return new Operator({
		symbol: "%",
		precedence: 60,
		evaluate: f,
	});
}

/**
 *
 * @param f
 */
export function power(f: opFunction): Operator {
	return new Operator({
		symbol: "^",
		precedence: 70,
		evaluate: f,
	});
}
