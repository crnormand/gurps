import {
	add,
	closeParen,
	equal,
	greaterThan,
	greaterThanOrEqual,
	lessThan,
	lessThanOrEqual,
	logicalAnd,
	logicalOr,
	multiply,
	not,
	divide,
	modulo,
	notEqual,
	openParen,
	Operator,
	opFunction,
	power,
	subtract,
} from "./types";

/**
 *
 * @param dbzrz
 */
export function fixedOperators(dbzrz: boolean): Operator[] {
	let eDivide: opFunction;
	let eModulo: opFunction;
	if (dbzrz) {
		eDivide = fixedDivideAllowDivideByZero;
		eModulo = fixedModuloAllowDivideByZero;
	} else {
		eDivide = fixedDivide;
		eModulo = fixedModulo;
	}

	return [
		openParen(),
		closeParen(),
		not(fixedNot),
		logicalOr(fixedLogicalOr),
		logicalAnd(fixedLogicalAnd),
		equal(fixedEqual),
		notEqual(fixedNotEqual),
		greaterThan(fixedGreaterThan),
		greaterThanOrEqual(fixedGreaterThanOrEqual),
		lessThan(fixedLessThan),
		lessThanOrEqual(fixedLessThanOrEqual),
		add(fixedAdd, fixedAddUnary),
		subtract(fixedSubtract, fixedSubtractUnary),
		multiply(fixedMultiply),
		divide(eDivide),
		modulo(eModulo),
		power(fixedPower),
	];
}

/**
 *
 * @param arg
 */
function fixedNot(arg: any): any {
	const b = Boolean(arg);
	if (typeof b === "boolean") return !b;
	const v = fixedFrom(arg);
	if (v === 0) return true;
	return false;
}

/**
 *
 * @param left
 * @param right
 */
function fixedLogicalOr(left: any, right: any): any {
	const l = fixedFrom(left);
	if (l !== 0) return true;
	let r = 0;
	r = fixedFrom(right);
	return r !== 0;
}

/**
 *
 * @param left
 * @param right
 */
function fixedLogicalAnd(left: any, right: any): any {
	const l = fixedFrom(left);
	if (l === 0) return false;
	let r = 0;
	r = fixedFrom(right);
	return r !== 0;
}

/**
 *
 * @param left
 * @param right
 */
function fixedEqual(left: any, right: any): any {
	let l;
	let r;
	try {
		l = fixedFrom(left);
		r = fixedFrom(right);
	} catch (err) {
		console.error(err);
		return left.toString() === right.toString();
	}
	return l === r;
}

/**
 *
 * @param left
 * @param right
 */
function fixedNotEqual(left: any, right: any): any {
	let l;
	let r;
	try {
		l = fixedFrom(left);
		r = fixedFrom(right);
	} catch (err) {
		console.error(err);
		return left.toString() !== right.toString();
	}
	return l !== r;
}

/**
 *
 * @param left
 * @param right
 */
function fixedGreaterThan(left: any, right: any): any {
	let l;
	let r;
	try {
		l = fixedFrom(left);
		r = fixedFrom(right);
	} catch (err) {
		console.error(err);
		return left.toString() > right.toString();
	}
	return l > r;
}

/**
 *
 * @param left
 * @param right
 */
function fixedGreaterThanOrEqual(left: any, right: any): any {
	let l;
	let r;
	try {
		l = fixedFrom(left);
		r = fixedFrom(right);
	} catch (err) {
		console.error(err);
		return left.toString() >= right.toString();
	}
	return l >= r;
}

/**
 *
 * @param left
 * @param right
 */
function fixedLessThan(left: any, right: any): any {
	let l;
	let r;
	try {
		l = fixedFrom(left);
		r = fixedFrom(right);
	} catch (err) {
		console.error(err);
		return left.toString() < right.toString();
	}
	return l < r;
}

/**
 *
 * @param left
 * @param right
 */
function fixedLessThanOrEqual(left: any, right: any): any {
	let l;
	let r;
	try {
		l = fixedFrom(left);
		r = fixedFrom(right);
	} catch (err) {
		console.error(err);
		return left.toString() <= right.toString();
	}
	return l <= r;
}

/**
 *
 * @param left
 * @param right
 */
function fixedAdd(left: any, right: any): any {
	let l;
	let r;
	try {
		l = fixedFrom(left);
		r = fixedFrom(right);
	} catch (err) {
		console.error(err);
		return left.toString() + right.toString();
	}
	return l + r;
}

/**
 *
 * @param arg
 */
function fixedAddUnary(arg: any): any {
	return fixedFrom(arg);
}

/**
 *
 * @param left
 * @param right
 */
function fixedSubtract(left: any, right: any): any {
	const l = fixedFrom(left);
	let r = 0;
	r = fixedFrom(right);
	return l - r;
}

/**
 *
 * @param arg
 */
function fixedSubtractUnary(arg: any): any {
	const v = fixedFrom(arg);
	return -v;
}

/**
 *
 * @param left
 * @param right
 */
function fixedMultiply(left: any, right: any): any {
	const l = fixedFrom(left);
	let r = 0;
	r = fixedFrom(right);
	return l * r;
}

/**
 *
 * @param left
 * @param right
 */
function fixedDivide(left: any, right: any): any {
	const l = fixedFrom(left);
	let r = 0;
	r = fixedFrom(right);
	if (r === 0) throw new Error("Divide by zero");
	return l / r;
}

/**
 *
 * @param left
 * @param right
 */
function fixedDivideAllowDivideByZero(left: any, right: any): any {
	const l = fixedFrom(left);
	let r = 0;
	r = fixedFrom(right);
	if (r === 0) return r;
	return l / r;
}

/**
 *
 * @param left
 * @param right
 */
function fixedModulo(left: any, right: any): any {
	const l = fixedFrom(left);
	let r = 0;
	r = fixedFrom(right);
	if (r === 0) throw new Error("Divide by zero");
	return l % r;
}

/**
 *
 * @param left
 * @param right
 */
function fixedModuloAllowDivideByZero(left: any, right: any): any {
	const l = fixedFrom(left);
	let r = 0;
	r = fixedFrom(right);
	if (r === 0) return r;
	return l % r;
}

/**
 *
 * @param left
 * @param right
 */
function fixedPower(left: any, right: any): any {
	const l = fixedFrom(left);
	let r = 0;
	r = fixedFrom(right);
	return Math.pow(l, r);
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
