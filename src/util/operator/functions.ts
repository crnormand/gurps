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
} from "./types"

/**
 *
 * @param dbzrz
 */
export function evalOperators(dbzrz: boolean): Operator[] {
	let eDivide: opFunction
	let eModulo: opFunction
	if (dbzrz) {
		eDivide = DivideAllowDivideByZero
		eModulo = ModuloAllowDivideByZero
	} else {
		eDivide = Divide
		eModulo = Modulo
	}

	return [
		openParen(),
		closeParen(),
		not(Not),
		logicalOr(LogicalOr),
		logicalAnd(LogicalAnd),
		equal(Equal),
		notEqual(NotEqual),
		greaterThan(GreaterThan),
		greaterThanOrEqual(GreaterThanOrEqual),
		lessThan(LessThan),
		lessThanOrEqual(LessThanOrEqual),
		add(Add, AddUnary),
		subtract(Subtract, SubtractUnary),
		multiply(Multiply),
		divide(eDivide),
		modulo(eModulo),
		power(Power),
	]
}

/**
 *
 * @param arg
 */
function Not(arg: any): any {
	const b = Boolean(arg)
	if (typeof b === "boolean") return !b
	const v = From(arg)
	if (v === 0) return true
	return false
}

/**
 *
 * @param left
 * @param right
 */
function LogicalOr(left: any, right: any): any {
	const l = From(left)
	if (l !== 0) return true
	let r = 0
	r = From(right)
	return r !== 0
}

/**
 *
 * @param left
 * @param right
 */
function LogicalAnd(left: any, right: any): any {
	const l = From(left)
	if (l === 0) return false
	let r = 0
	r = From(right)
	return r !== 0
}

/**
 *
 * @param left
 * @param right
 */
function Equal(left: any, right: any): any {
	let l
	let r
	try {
		l = From(left)
		r = From(right)
	} catch (err) {
		console.error(err)
		return left.toString() === right.toString()
	}
	return l === r
}

/**
 *
 * @param left
 * @param right
 */
function NotEqual(left: any, right: any): any {
	let l
	let r
	try {
		l = From(left)
		r = From(right)
	} catch (err) {
		console.error(err)
		return left.toString() !== right.toString()
	}
	return l !== r
}

/**
 *
 * @param left
 * @param right
 */
function GreaterThan(left: any, right: any): any {
	let l
	let r
	try {
		l = From(left)
		r = From(right)
	} catch (err) {
		console.error(err)
		return left.toString() > right.toString()
	}
	return l > r
}

/**
 *
 * @param left
 * @param right
 */
function GreaterThanOrEqual(left: any, right: any): any {
	let l
	let r
	try {
		l = From(left)
		r = From(right)
	} catch (err) {
		console.error(err)
		return left.toString() >= right.toString()
	}
	return l >= r
}

/**
 *
 * @param left
 * @param right
 */
function LessThan(left: any, right: any): any {
	let l
	let r
	try {
		l = From(left)
		r = From(right)
	} catch (err) {
		console.error(err)
		return left.toString() < right.toString()
	}
	return l < r
}

/**
 *
 * @param left
 * @param right
 */
function LessThanOrEqual(left: any, right: any): any {
	let l
	let r
	try {
		l = From(left)
		r = From(right)
	} catch (err) {
		console.error(err)
		return left.toString() <= right.toString()
	}
	return l <= r
}

/**
 *
 * @param left
 * @param right
 */
function Add(left: any, right: any): any {
	let l
	let r
	try {
		l = From(left)
		r = From(right)
	} catch (err) {
		console.error(err)
		return left.toString() + right.toString()
	}
	return l + r
}

/**
 *
 * @param arg
 */
function AddUnary(arg: any): any {
	return From(arg)
}

/**
 *
 * @param left
 * @param right
 */
function Subtract(left: any, right: any): any {
	const l = From(left)
	let r = 0
	r = From(right)
	return l - r
}

/**
 *
 * @param arg
 */
function SubtractUnary(arg: any): any {
	const v = From(arg)
	return -v
}

/**
 *
 * @param left
 * @param right
 */
function Multiply(left: any, right: any): any {
	const l = From(left)
	let r = 0
	r = From(right)
	return l * r
}

/**
 *
 * @param left
 * @param right
 */
function Divide(left: any, right: any): any {
	const l = From(left)
	let r = 0
	r = From(right)
	if (r === 0) throw new Error("Divide by zero")
	return l / r
}

/**
 *
 * @param left
 * @param right
 */
function DivideAllowDivideByZero(left: any, right: any): any {
	const l = From(left)
	let r = 0
	r = From(right)
	if (r === 0) return r
	return l / r
}

/**
 *
 * @param left
 * @param right
 */
function Modulo(left: any, right: any): any {
	const l = From(left)
	let r = 0
	r = From(right)
	if (r === 0) throw new Error("Divide by zero")
	return l % r
}

/**
 *
 * @param left
 * @param right
 */
function ModuloAllowDivideByZero(left: any, right: any): any {
	const l = From(left)
	let r = 0
	r = From(right)
	if (r === 0) return r
	return l % r
}

/**
 *
 * @param left
 * @param right
 */
function Power(left: any, right: any): any {
	const l = From(left)
	let r = 0
	r = From(right)
	return Math.pow(l, r)
}

/**
 *
 * @param arg
 */
function From(arg: any): number {
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
