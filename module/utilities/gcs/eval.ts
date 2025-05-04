import { Operator } from './operator.js'

class Evaluator {
  resolver: Evaluator.VariableResolver
  operators: Operator[]
  functions: Record<string, Evaluator.Function>
  operandStack: Evaluator.Operand[]
  operatorStack: Evaluator.ExpressionOperator[]

  /* ---------------------------------------- */

  constructor(options: {
    resolver: Evaluator.VariableResolver
    operators?: Operator[]
    functions?: Record<string, Evaluator.Function>
  }) {
    this.resolver = options.resolver
    this.operators = options.operators || []
    this.functions = options.functions || {}
    this.operandStack = []
    this.operatorStack = []
  }

  /* ---------------------------------------- */
  /*  Instance Functions                      */
  /* ---------------------------------------- */

  evaluate(expression: string): Operator.Arg {
    const isValid = this.parse(expression)
    if (!isValid) return null

    while (this.operatorStack.length !== 0) this.processTree()
    if (this.operandStack.length !== 0) {
      console.error('GURPS Eval: Operand stack not empty', this.operandStack)
      return ''
    }
    return this.evaluateOperand(this.operandStack.at(-1)!)[0]
  }

  /* ---------------------------------------- */

  evaluateNew(expression: string): Operator.Arg {
    const newEvaluator = new Evaluator({
      resolver: this.resolver,
      operators: this.operators,
      functions: this.functions,
    })
    return newEvaluator.evaluate(expression)
  }

  /* ---------------------------------------- */

  /**
   * Parse the expression and build the operand and operator stacks.
   */
  parse(expression: string): boolean {
    let unaryOperator: Operator | null = null
    let haveOperand = false
    this.operandStack = []
    this.operatorStack = []
    let index = 0
    while (index < expression.length) {
      const char = expression[index]
      // Skip whitespace
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        index++
        continue
      }

      let [operatorIndex, operator] = this.nextOperator(expression, index)
      if (operatorIndex > index || operatorIndex === -1) {
        let hasError = false
        ;[index, hasError] = this.processOperand(expression, index, operatorIndex, unaryOperator)
        if (hasError) return false
        haveOperand = true
        unaryOperator = null
      }
      if (operatorIndex === index) {
        if (operator !== null && operator.evaluateUnary !== null && index === 0) {
          index = operatorIndex + operator.symbol.length
          if (unaryOperator !== null) {
            console.error(`GURPS Eval: Consecutive unary operators are not allowed at index ${index}`)
            return false
          }
        } else {
          let hasError = false
          ;[index, hasError] = this.processOperator(expression, operatorIndex, operator, haveOperand, unaryOperator)
          if (hasError) return false
          unaryOperator = null
        }

        if (operator === null || operator.symbol !== ')') {
          haveOperand = false
        }
      }
    }

    return true
  }

  /* ---------------------------------------- */

  nextOperator(expression: string, start: number, match: Operator | null = null): [number, Operator | null] {
    for (let i = start; i < expression.length; i++) {
      if (match !== null) {
        if (match.match(expression, i, expression.length)) {
          return [i, match]
        }
      } else {
        for (const operator of this.operators) {
          if (operator.match(expression, i, expression.length)) {
            return [i, operator]
          }
        }
      }
    }

    return [-1, null]
  }

  /* ---------------------------------------- */

  processOperand(
    expression: string,
    start: number,
    operatorIndex: number,
    unaryOperator: Operator | null
  ): [number, boolean] {
    if (operatorIndex === -1) {
      const text = expression.substring(start).trim()
      if (text.length === 0) {
        console.error(`GURPS Eval: Empty operand at index ${start}`)
        return [-1, true]
      }
      this.operandStack.push({ value: text, unaryOp: unaryOperator } as Evaluator.ExpressionOperand)
      return [expression.length, false]
    }

    const text = expression.substring(start, operatorIndex).trim()
    if (text.length === 0) {
      console.error(`GURPS Eval: Empty operand at index ${start}`)
      return [-1, true]
    }
    this.operandStack.push({ value: text, unaryOp: unaryOperator } as Evaluator.ExpressionOperand)
    return [operatorIndex, false]
  }

  /* ---------------------------------------- */

  processOperator(
    expression: string,
    index: number,
    operator: Operator | null,
    haveOperand: boolean,
    unaryOperator: Operator | null = null
  ): [number, boolean] {
    if (haveOperand && operator !== null && operator.symbol === '(') {
      let hasError = false
      ;[index, operator, hasError] = this.processFunction(expression, index)
      if (hasError) return [-1, true]

      index += operator?.symbol.length ?? 0
      let tempIndex: number = 0
      ;[tempIndex, operator] = this.nextOperator(expression, index, null)
      if (operator === null) return [index, false]
      index = tempIndex
    }

    switch (operator?.symbol) {
      case '(':
        this.operatorStack.push({ op: operator, unaryOp: unaryOperator } as Evaluator.ExpressionOperator)
        break
      case ')':
        let stackOp: Evaluator.ExpressionOperator | null = null
        if (this.operatorStack.length > 0) stackOp = this.operatorStack.at(-1)!
        while (stackOp !== null && stackOp.op.symbol !== '(') {
          this.processTree()
          if (this.operatorStack.length > 0) {
            stackOp = this.operatorStack.at(-1)!
          } else {
            stackOp = null
          }
        }
        if (this.operatorStack.length === 0) {
          console.error(`GURPS Eval: Unmatched parenthesis at index ${index}`)
          return [-1, true]
        }
        stackOp = this.operatorStack.at(-1)!
        if (stackOp.op.symbol !== '(') {
          console.error(`GURPS Eval: Unmatched parenthesis at index ${index}`)
          return [-1, true]
        }
        this.operatorStack.pop()
        if (stackOp.unaryOp !== null) {
          const left = this.operandStack.pop()!
          this.operandStack.push(new Evaluator.ExpressionTree({ evaluator: this, left, unaryOp: stackOp.unaryOp }))
        }
        break
      default:
        if (this.operatorStack.length > 0) {
          let stackOp: Evaluator.ExpressionOperator | null = this.operatorStack.at(-1)!
          while (stackOp !== null && stackOp.op.precedence >= (operator?.precedence ?? 0)) {
            this.processTree()
            if (this.operatorStack.length > 0) {
              stackOp = this.operatorStack.at(-1)!
            } else {
              stackOp = null
            }
          }
        }
        this.operatorStack.push({ op: operator, unaryOp: unaryOperator } as Evaluator.ExpressionOperator)
    }
    return [index + (operator?.symbol.length ?? 0), false]
  }

  /* ---------------------------------------- */

  processFunction(expression: string, operatorIndex: number): [number, Operator | null, boolean] {
    let operator: Operator | null = null
    let parens = 1
    let next = operatorIndex

    while (parens > 0) {
      ;[next, operator] = this.nextOperator(expression, next + 1, null)
      if (operator === null) {
        console.error(`GURPS Eval: Unmatched parenthesis at index ${next}`)
        return [-1, null, true]
      }

      switch (operator.symbol) {
        case '(':
          parens++
          break
        case ')':
          parens--
      }
    }

    if (this.operandStack.length === 0) {
      console.error(`GURPS Eval: Invalid stack at index ${next}`)
      return [-1, null, true]
    }

    const operand = this.operandStack.at(-1)
    if (!(operand instanceof Evaluator.ExpressionOperand)) {
      console.error(`GURPS Eval: Unexpected operand stack value at index ${next}`)
      return [-1, null, true]
    }

    this.operandStack.pop()
    const f = this.functions[operand.value]
    if (f === undefined) {
      console.error(`GURPS Eval: Unknown function ${operand.value} at index ${next}`)
      return [-1, null, true]
    }

    this.operandStack.push({
      function: f,
      args: expression.substring(operatorIndex + 1, next),
      unaryOp: operand.unaryOp,
    } as Evaluator.ParsedFunction)
    return [next, operator!, false]
  }

  /* ---------------------------------------- */

  processTree(): void {
    let right: Evaluator.Operand = null
    if (this.operandStack.length > 0) {
      right = this.operandStack.pop()!
    }
    let left: Evaluator.Operand = null
    if (this.operandStack.length > 0) {
      left = this.operandStack.pop()!
    }
    const op = this.operatorStack.pop()!
    this.operandStack.push(new Evaluator.ExpressionTree({ evaluator: this, left, right, op: op.op }))
  }

  /* ---------------------------------------- */

  evaluateOperand(operand: Evaluator.Operand): [Operator.Arg, boolean] {
    switch (true) {
      case operand instanceof Evaluator.ExpressionTree: {
        let [left, hasError] = operand.evaluator.evaluateOperand(operand.left)
        if (hasError) return [null, true]
        let right: Operator.Arg = null
        ;[right, hasError] = operand.evaluator.evaluateOperand(operand.right)
        if (hasError) return [null, true]

        if (operand.left !== null && operand.right !== null && operand.op !== null) {
          if (operand.op.evaluate === null) {
            console.error(`GURPS Eval: Operator does not have evaluate function`)
            return [null, true]
          }

          let value: Operator.Arg = null
          ;[value, hasError] = operand.op.evaluate(left, right)
          if (hasError) return [null, true]

          if (operand.unaryOp !== null && operand.unaryOp.evaluateUnary !== null)
            return operand.unaryOp.evaluateUnary(value)

          return [value, false]
        }
        let value: Operator.Arg = null
        if (operand.right === null) value = left
        else value = right

        if (value !== null) {
          if (operand.unaryOp !== null && operand.unaryOp.evaluateUnary !== null) {
            ;[value, hasError] = operand.unaryOp.evaluateUnary(value)
          } else if (operand.op !== null && operand.op.evaluateUnary !== null) {
            ;[value, hasError] = operand.op.evaluateUnary(value)
          }
          if (hasError) return [null, true]
        }

        if (value === null) {
          console.error(`GURPS Eval: Operand is null`)
          return [null, true]
        }
        return [value, false]
      }
      case operand instanceof Evaluator.ExpressionOperand: {
        let [value, hasError] = this.replaceVariables(operand.value)
        if (hasError) return [null, true]
        if (operand.unaryOp !== null && operand.unaryOp.evaluateUnary !== null) {
          return operand.unaryOp.evaluateUnary(value)
        }
        return [value, false]
      }
      case operand instanceof Evaluator.ParsedFunction: {
        let [str, hasError] = this.replaceVariables(operand.args)
        if (hasError) return [null, true]
        let value: Operator.Arg = null
        ;[value, hasError] = operand.function(this, str)
        if (hasError) return [null, true]
        if (operand.unaryOp !== null && operand.unaryOp.evaluateUnary !== null)
          return operand.unaryOp.evaluateUnary(value)
        return [value, false]
      }
      default: {
        if (operand !== null) {
          console.error(`GURPS Eval: Expression is invalid`)
          return [null, true]
        }
        return [null, false]
      }
    }
  }

  /* ---------------------------------------- */

  replaceVariables(expression: string): [string, boolean] {
    let dollarIndex = expression.indexOf('$')
    if (dollarIndex === -1) return [expression, false]
    if (this.resolver === null) {
      console.error(`GURPS Eval: No variable resolver, yet variables present at index ${dollarIndex}`)
      return ['', true]
    }
    while (dollarIndex >= 0) {
      let lastIndex = dollarIndex
      for (let i = dollarIndex + 1; i < expression.length; ) {
        const char = expression[i]
        if (char.match(/[a-zA-Z0-9_\.#]/)) lastIndex = dollarIndex + 1 + i
        else break
      }

      if (dollarIndex === lastIndex) {
        console.error(`GURPS Eval: Empty variable at index ${dollarIndex}`)
        return ['', true]
      }
      const name = expression.substring(dollarIndex + 1, lastIndex + 1)
      const value = this.resolver.resolveVariable(name)
      if (value.trim().length === 0) {
        console.error(`GURPS Eval: Unable to resolve variable at index ${dollarIndex}`)
        return ['', true]
      }

      let buffer = ''
      if (dollarIndex > 0) buffer += expression.substring(0, dollarIndex)
      buffer += value
      if (lastIndex + 1 < expression.length) buffer += expression.substring(lastIndex + 1)
      expression = buffer
      dollarIndex = expression.indexOf('$', dollarIndex)
    }
    return [expression, false]
  }

  /* ---------------------------------------- */
  /*  Static Functions                        */
  /* ---------------------------------------- */

  static evalToBoolean(evaluator: Evaluator, arg: string): boolean {
    const evaluated = evaluator.evaluateNew(arg)
    switch (typeof evaluated) {
      case 'string':
        return ['1', 'true', 'yes', 'y', 'on'].includes(evaluated.toLowerCase())
      case 'number':
        return evaluated !== 0
      case 'bigint':
        return evaluated !== BigInt(0)
      case 'boolean':
        return evaluated
      case 'symbol':
        return false
      case 'undefined':
        return false
      case 'object':
        return false
      case 'function':
        return false
      default:
        return false
    }
  }

  /* ---------------------------------------- */

  static evalToNumber(evaluator: Evaluator, arg: string): number {
    const evaluated = evaluator.evaluateNew(arg)
    switch (typeof evaluated) {
      case 'string':
        return parseFloat(evaluated)
      case 'number':
        return evaluated
      case 'bigint':
        return Number(evaluated)
      case 'boolean':
        return evaluated ? 1 : 0
      case 'symbol':
        return NaN
      case 'undefined':
        return NaN
      case 'object':
        return NaN
      case 'function':
        return NaN
      default:
        return NaN
    }
  }

  /* ---------------------------------------- */

  static evalToString(evaluator: Evaluator, arg: string): string {
    const evaluated = evaluator.evaluateNew(arg)
    switch (typeof evaluated) {
      case 'string':
        return evaluated
      case 'number':
        return evaluated.toString()
      case 'boolean':
        return evaluated ? 'true' : 'false'
      case 'symbol':
        return ''
      case 'undefined':
        return ''
      case 'object':
        return ''
      case 'function':
        return ''
      default:
        return ''
    }
  }

  /* ---------------------------------------- */

  static nextArg(args: string): [string, string] {
    let parens = 0
    for (let i = 0; i < args.length; i++) {
      const char = args[i]
      switch (true) {
        case char === '(':
          parens++
          break
        case char === ')':
          parens--
          break
        case char === ',' && parens === 0:
          return [args.substring(0, i), args.substring(i + 1)]
      }
    }
    return [args, '']
  }
}

/* ---------------------------------------- */

namespace Evaluator {
  // TODO: expand to add support for trees & recursion
  export type Operand = Operator.Arg | ParsedFunction | ExpressionTree | ExpressionOperand

  /* ---------------------------------------- */

  // export type Operator2 = ExpressionOperator | ParsedFunction

  /* ---------------------------------------- */

  export type Function = (evaluator: Evaluator, arg: string) => [Operator.Arg, boolean]

  /* ---------------------------------------- */

  export interface VariableResolver {
    resolveVariable(name: string): string
  }

  /* ---------------------------------------- */

  export class ParsedFunction {
    unaryOp: Operator
    function: Function
    args: string

    constructor(options: { unaryOp: Operator; function: Function; args: string }) {
      this.unaryOp = options.unaryOp
      this.function = options.function
      this.args = options.args
    }
  }

  /* ---------------------------------------- */

  export class ExpressionOperand {
    unaryOp: Operator | null
    value: string
    constructor(options: { unaryOp?: Operator | null; value: string }) {
      this.unaryOp = options.unaryOp || null
      this.value = options.value
    }
  }

  /* ---------------------------------------- */

  export class ExpressionOperator {
    op: Operator
    unaryOp: Operator | null

    constructor(options: { op: Operator; unaryOp?: Operator | null }) {
      this.op = options.op
      this.unaryOp = options.unaryOp || null
    }
  }

  /* ---------------------------------------- */

  export class ExpressionTree {
    evaluator: Evaluator
    left: Operand
    right: Operand | null
    op: Operator | null
    unaryOp: Operator | null

    constructor(options: {
      evaluator: Evaluator
      left: Operand
      right?: Operand | null
      op?: Operator | null
      unaryOp?: Operator | null
    }) {
      this.evaluator = options.evaluator
      this.left = options.left
      this.right = options.right || null
      this.op = options.op || null
      this.unaryOp = options.unaryOp || null
    }
  }
}

export { Evaluator }
