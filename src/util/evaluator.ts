import { fixedOperators, Operator } from "./operator";
import { fixedFunctions } from "./function";

class expressionOperand {
	constructor(data?: expressionOperand) {
		if (data) {
			this.value = data.value;
			this.unaryOp = data.unaryOp;
		}
	}
}

interface expressionOperand {
	value: string;
	unaryOp: Operator | null;
}

class expressionOperator {
	constructor(data?: expressionOperatorDef) {
		if (data) {
			this.op = data.op;
			this.unaryOp = data.unaryOp;
		}
	}
}

interface expressionOperator {
	op: Operator | null;
	unaryOp: Operator | null;
}

interface expressionOperatorDef {
	op: Operator | null;
	unaryOp: Operator | null;
}

class expressionTree {
	constructor(data?: expressionTreeDef) {
		if (data) {
			this.evaluator = data.evaluator;
			this.left = data.left;
			this.right = data.right;
			this.op = data.op ?? null;
			this.unaryOp = data.unaryOp ?? null;
		}
	}
}

interface expressionTree {
	evaluator: Evaluator;
	left?: any;
	right?: any;
	op: Operator | null;
	unaryOp: Operator | null;
}

interface expressionTreeDef {
	evaluator: Evaluator;
	left?: any;
	right?: any;
	op?: Operator | null;
	unaryOp?: Operator | null;
}

type eFunction = (evaluator: Evaluator | null, options: string) => any;

class parsedFunction {
	constructor(data?: parsedFunctionDef) {
		if (data) {
			this.function = data.function;
			this.args = data.args;
			this.unaryOp = data.unaryOp;
		}
	}
}

interface parsedFunction {
	function: eFunction;
	args: string;
	unaryOp: Operator | null;
}

interface parsedFunctionDef {
	function: eFunction;
	args: string;
	unaryOp: Operator | null;
}

export interface VariableResolver {
	resolveVariable: (variableName: string) => string;
}

/**
 *
 * @param expression
 * @param resolver
 */
export function evaluateToNumber(expression: string, resolver: VariableResolver): number {
	let result = 0;
	try {
		result = new Evaluator({ resolver: resolver }).evaluate(expression);
	} catch (err) {
		console.error(err, `Unable to resolve ${expression}`);
		return 0;
	}
	if (typeof result === "number") return parseFloat(result.toFixed(4));
	else if (typeof parseFloat(result) === "number") return parseFloat(result);
	console.error(`Unable to resolve ${expression} to a number`);
	return 0;
}

const evalOperators = fixedOperators;
const evalFunctions = fixedFunctions;

export interface Evaluator {
	resolver?: VariableResolver;
	operators: Array<Operator>;
	operandStack: any[];
	functions: Map<string, eFunction>;
	operatorStack: expressionOperator[];
}

interface EvaluatorDef {
	resolver: VariableResolver;
	operators?: Array<Operator>;
	functions?: Map<string, eFunction>;
}

export class Evaluator {
	constructor(data?: EvaluatorDef) {
		this.resolver = data?.resolver;
		this.operators = data?.operators ?? evalOperators(true);
		this.functions = data?.functions ?? evalFunctions();
	}

	evaluate(expression: string): any {
		this.parse(expression);
		while (this.operatorStack.length !== 0) {
			this.processTree();
		}
		if (this.operandStack.length === 0) return ["", null];
		return this.evaluateOperand(this.operandStack[this.operandStack.length - 1]);
	}

	evaluateNew(expression: string): any {
		const other = new Evaluator({
			resolver: this.resolver,
			operators: this.operators,
			functions: this.functions,
		} as EvaluatorDef);
		return other.evaluate(expression);
	}

	parse(expression: string): void {
		let unaryOp: Operator | null = null;
		let haveOperand = false;
		let haveOperator = false;
		this.operandStack = [];
		this.operatorStack = [];
		let i = 0;
		while (i < expression.length) {
			const ch = expression[i];
			if ([" ", "\t", "\n", "\r"].includes(ch)) {
				i++;
				continue;
			}
			const [opIndex, op] = this.nextOperator(expression, i, null);
			if (opIndex > i || opIndex === -1) {
				i = this.processOperand(expression, i, opIndex, unaryOp);
				haveOperand = true;
				haveOperator = false;
				unaryOp = null;
			}
			if (opIndex === i) {
				if (op && op.evaluateUnary && (haveOperator || i === 0)) {
					i = opIndex + op.symbol.length;
					if (unaryOp) throw new Error(`Consecutive unary operators are not allowed at index ${i}`);
					unaryOp = op;
				} else {
					i = this.processOperator(expression, opIndex, op, haveOperand, unaryOp);
					unaryOp = null;
				}
				if (!op || op.symbol !== ")") {
					haveOperand = false;
					haveOperator = true;
				}
			}
		}
	}

	nextOperator(expression: string, start: number, match: Operator | null): [number, Operator | null] {
		for (let i = start; i < expression.length; i++) {
			if (match) {
				if (match.match(expression, i, expression.length)) return [i, match];
			} else {
				for (const op of this.operators) {
					if (op.match(expression, i, expression.length)) return [i, op];
				}
			}
		}
		return [-1, null];
	}

	processOperand(expression: string, start: number, opIndex: number, unaryOp: Operator | null): number {
		if (opIndex === -1) {
			const text = expression.substring(start).trim();
			if (text === "") throw new Error(`Expression is invalid at index ${start}`);
			this.operandStack.push(new expressionOperand({ value: text, unaryOp: unaryOp }));
			return expression.length;
		}
		const text = expression.substring(start, opIndex).trim();
		if (text === "") throw new Error(`Expression is invalid at index ${start}`);
		this.operandStack.push(new expressionOperand({ value: text, unaryOp: unaryOp }));
		return opIndex;
	}

	processOperator(
		expression: string,
		index: number,
		op: Operator | null,
		haveOperand: boolean,
		unaryOp: Operator | null
	): number {
		if (haveOperand && op && op.symbol === "(") {
			[index, op] = this.processFunction(expression, index);
			index += op?.symbol.length || 0;
			let tmp: number;
			[tmp, op] = this.nextOperator(expression, index, null);
			if (!op) return index;
			index = tmp;
		}
		let stackOp: expressionOperator | null = null;
		switch (op!.symbol) {
			case "(":
				this.operatorStack.push(new expressionOperator({ op: op, unaryOp: unaryOp }));
				break;
			case ")":
				if (this.operatorStack.length > 0) stackOp = this.operatorStack[this.operatorStack.length - 1];
				while (stackOp && stackOp.op?.symbol !== "(") {
					this.processTree();
					if (this.operatorStack.length > 0) stackOp = this.operatorStack[this.operatorStack.length - 1];
					else stackOp = null;
				}
				if (this.operatorStack.length === 0) throw new Error(`Invalid expression at index ${index}`);
				stackOp = this.operatorStack[this.operatorStack.length - 1];
				if (stackOp.op?.symbol !== "(") throw new Error(`Invalid expression at index ${index}`);
				this.operatorStack.pop();
				if (!stackOp?.unaryOp) {
					const left = this.operandStack[this.operandStack.length - 1];
					this.operandStack.pop();
					this.operandStack.push(
						new expressionTree({
							evaluator: this,
							left: left,
							unaryOp: stackOp?.unaryOp,
						})
					);
				}
				break;
			default:
				if (this.operatorStack.length > 0) {
					stackOp = this.operatorStack[this.operatorStack.length - 1];
					while (stackOp?.op?.precedence && op?.precedence && stackOp.op.precedence >= op.precedence) {
						this.processTree();
						if (this.operatorStack.length > 0) stackOp = this.operatorStack[this.operatorStack.length - 1];
						else stackOp = null;
					}
				}
				this.operatorStack.push(new expressionOperator({ op: op, unaryOp: unaryOp }));
		}
		return index + op!.symbol.length;
	}

	processFunction(expression: string, opIndex: number): [number, Operator | null] {
		let op: Operator | null = null;
		let parens = 1;
		let next = opIndex;
		while (parens > 0) {
			[next, op] = this.nextOperator(expression, next + 1, null);
			if (!op) throw new Error(`Function not closed at index ${opIndex}`);
			switch (op.symbol) {
				case "(":
					parens++;
					break;
				case ")":
					parens--;
					break;
			}
		}
		if (this.operandStack.length === 0) throw new Error(`Invalid stack at index ${next}`);
		const operand = this.operandStack[this.operandStack.length - 1] as expressionOperand;
		if (!operand) throw new Error(`Unexpected operand stack value at index ${next}`);
		this.operandStack.pop();
		const f = this.functions.get(operand.value);
		if (!f) throw new Error(`Function not defined: ${operand.value}`);
		this.operandStack.push(
			new parsedFunction({
				function: f,
				args: expression.substring(opIndex + 1, next),
				unaryOp: operand.unaryOp,
			})
		);
		return [next, op];
	}

	processTree() {
		let [left, right]: any = [null, null];
		if (this.operandStack.length > 0) right = this.operandStack.pop();
		if (this.operandStack.length > 0) left = this.operandStack.pop();
		const op = this.operatorStack.pop();
		this.operandStack.push(
			new expressionTree({
				evaluator: this,
				left: left,
				right: right,
				op: op?.op,
			})
		);
	}

	evaluateOperand(operand: any): any {
		if (operand instanceof expressionTree) {
			let left;
			let right;
			try {
				left = operand.evaluator?.evaluateOperand(operand.left);
				right = operand.evaluator?.evaluateOperand(operand.right);
			} catch (err) {
				console.error(err);
				return null;
			}
			if (operand.left && operand.right) {
				if (!operand.op?.evaluate) throw new Error("Operator does ot have Evaluate function defined");
				let v: any;
				try {
					v = operand.op.evaluate(left, right);
				} catch (err) {
					console.error(err);
					return null;
				}
				if (operand.unaryOp && operand.unaryOp.evaluateUnary) return operand.unaryOp.evaluateUnary(v);
				return v;
			}
			let v: any;
			if (!operand.right) v = left;
			else v = right;
			if (v) {
				try {
					if (operand.unaryOp && operand.unaryOp.evaluateUnary) v = operand.unaryOp.evaluateUnary(v);
					else if (operand.op && operand.op.evaluateUnary) v = operand.op.evaluateUnary(v);
				} catch (err) {
					console.error(err);
					return null;
				}
			}
			if (!v) throw new Error("Expression is invalid");
			return v;
		} else if (operand instanceof expressionOperand) {
			const v = this.replaceVariables(operand.value);
			if (operand.unaryOp && operand.unaryOp.evaluateUnary) return operand.unaryOp.evaluateUnary(v);
			return v;
		} else if (operand instanceof parsedFunction) {
			const s = this.replaceVariables(operand.args);
			const v = operand.function(this, s);
			if (operand.unaryOp && operand.unaryOp.evaluateUnary) return operand.unaryOp.evaluateUnary(v);
			return v;
		} else {
			if (operand) throw new Error("Invalid expression");
			return null;
		}
	}

	replaceVariables(expression: string): string {
		let dollar = expression.indexOf("$");
		if (dollar === -1) return expression;
		if (!this.resolver) throw new Error(`No variable resolver, yet variables present at index ${dollar}`);
		while (dollar >= 0) {
			let last = dollar;
			for (let i = 0; i < expression.substring(dollar + 1).split("").length; i++) {
				const ch = expression.substring(dollar + 1).split("")[i];
				if (ch.match("[a-zA-Z.#_]") || (i !== 0 && ch.match("[0-9]"))) last = dollar + 1 + i;
				else break;
			}
			if (dollar === last) throw new Error(`Invalid variable at index ${dollar}`);
			const name = expression.substring(dollar + 1, last + 1);
			const v = this.resolver.resolveVariable(name);
			if (v.trim() === "") throw new Error(`Unable to resolve variable $${name}`);
			let buffer = "";
			if (dollar > 0) buffer += expression.substring(0, dollar);
			buffer += v;
			if (last + 1 < expression.length) buffer += expression.substring(last + 1);
			expression = buffer;
			dollar = expression.indexOf("$");
		}
		return expression;
	}
}
