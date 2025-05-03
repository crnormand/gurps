import { has } from 'lib/markdown-it.js'
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

  evaluate(expression: string): unknown {
    const isValid = this.parse(expression)
    if (!isValid) return null

    while (this.operatorStack.length !== 0) this.processTree()
    if (this.operandStack.length !== 0) {
      console.error('GURPS Eval: Operand stack not empty', this.operandStack)
      return ''
    }
    return this.evaluateOperand(this.operandStack.at(-1))
  }

  /* ---------------------------------------- */

  evaluateNew(expression: string): unknown {
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
          ;[index, hasError] = this.processOperator(expression, index, operatorIndex, unaryOperator)
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

  nextOperator(expression: string, start: number, match: Operator | null): [number, Operator | null] {
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

  /* ---------------------------------------- */
}

/* ---------------------------------------- */

namespace Evaluator {
  // TODO: expand to add support for trees & recursion
  export type Operand = Operator.Arg

  /* ---------------------------------------- */

  export type Function = (evaluator: Evaluator, arg: string) => unknown

  /* ---------------------------------------- */

  export interface ParsedFunction {
    unaryOp: Operator
    function: Function
    args: string
  }

  /* ---------------------------------------- */

  export interface VariableResolver {
    resolveVariable(name: string): string
  }

  /* ---------------------------------------- */

  export interface ExpressionOperand {
    unaryOp: Operator
    value: string
  }
  /* ---------------------------------------- */

  export interface ExpressionOperator {
    op: Operator
    unaryOp: Operator
  }

  /* ---------------------------------------- */

  export interface ExpressionTree {
    evaluator: Evaluator
    // TODO: change any for specific type
    left: Operand
    right: Operand
    op: Operator
    unaryOp: Operator
  }
}
function evalToBoolean(evaluator: Evaluator, arg: string): boolean {}
