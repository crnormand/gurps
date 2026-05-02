// expression-evaluator.ts

import { ExprNode } from './expression-ast.js'

export interface EvalContext {
  variables: Record<string, number>
  functions?: Record<string, (...args: number[]) => number>
}

export function evaluateExpression(node: ExprNode, ctx: EvalContext): number {
  switch (node.kind) {
    case 'number':
      return node.value

    case 'variable':
      return ctx.variables[node.name] ?? 0

    case 'unary':
      return -evaluateExpression(node.expr, ctx)

    case 'call': {
      const fn = ctx.functions?.[node.name]

      if (!fn) throw new Error(`Unknown function ${node.name}`)

      const args = node.args.map(arg => evaluateExpression(arg, ctx))

      return fn(...args)
    }

    case 'binary': {
      const left = evaluateExpression(node.left, ctx)
      const right = evaluateExpression(node.right, ctx)

      switch (node.op) {
        case '+':
          return left + right
        case '-':
          return left - right
        case '*':
          return left * right
        case '/':
          return left / right
      }
    }
  }
}
