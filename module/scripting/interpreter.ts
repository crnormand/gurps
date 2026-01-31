import { parse, BlockStatement, Program } from '../../scripts/acorn.mjs'

import { Scope } from './scope.ts'
import { ScriptEnvironment } from './types.ts'

type FuncValue = {
  __kind: 'function'
  name?: string
  params: string[]
  body: BlockStatement
  scope: Scope
}

/* ---------------------------------------- */

class ReturnSignal {
  value: unknown
  constructor(value: unknown) {
    this.value = value
  }
}

/* ---------------------------------------- */

class ScriptInterpreter {
  static MAX_STEPS = 20_000

  #steps: number
  #global: Scope

  /* ---------------------------------------- */

  static runScript(script: string, initialEnv: ScriptEnvironment): unknown {
    const interpreter = new ScriptInterpreter(initialEnv)

    try {
      const program = interpreter.#parseScript(script)

      return interpreter.#runScript(program)
    } catch (error) {
      console.error('Script execution error:', error)

      return ''
    }
  }

  /* ---------------------------------------- */

  constructor(initialEnv: ScriptEnvironment) {
    this.#steps = 0
    this.#global = new Scope()
    for (const [key, value] of Object.entries(initialEnv)) this.#global.define(key, value)
  }

  /* ---------------------------------------- */

  #bump(): void {
    this.#steps++
    if (this.#steps > ScriptInterpreter.MAX_STEPS) throw new Error('Maximum execution steps exceeded')
  }

  /* ---------------------------------------- */

  #executeStatement(n: any, scope: Scope): any {
    this.#bump()

    switch (n.type) {
      case 'FunctionDeclaration': {
        const name = n.id.name

        if (!name) throw new Error('Anonymous function declarations are not supported')

        const params = n.params.map((param: any) => {
          if (param.type !== 'Identifier') throw new Error('Only simple parameters are supported')

          return param.name
        })

        const func: FuncValue = {
          __kind: 'function',
          name,
          params,
          body: n.body,
          scope,
        }

        scope.define(name, func)

        return undefined
      }

      case 'ReturnStatement': {
        const v = n.argument ? this.#evaluateExpression(n.argument, scope) : undefined

        throw new ReturnSignal(v)
      }

      case 'ExpressionStatement': {
        return this.#evaluateExpression(n.expression, scope)
      }

      case 'VariableDeclaration': {
        for (const decl of n.declarations) {
          if (decl.id.type !== 'Identifier') throw new Error('Only simple variable declarations are supported')
          const val = decl.init ? this.#evaluateExpression(decl.init, scope) : undefined

          scope.define(decl.id.name, val)
        }

        return undefined
      }

      case 'BlockStatement': {
        const innerScope = new Scope(scope)
        let last: unknown = undefined

        for (const stmt of n.body) last = this.#executeStatement(stmt, innerScope)

        return last
      }

      default:
        throw new Error(`Unsupported statement type: ${n.type}`)
    }
  }

  /* ---------------------------------------- */

  #callFunc(func: FuncValue, args: any[]): any {
    this.#bump()
    const callScope = new Scope(func.scope)

    for (let i = 0; i < func.params.length; i++) {
      callScope.define(func.params[i], args[i])
    }

    try {
      let last: unknown = undefined

      for (const stmt of func.body.body) last = this.#executeStatement(stmt, callScope)

      return last
    } catch (error) {
      if (error instanceof ReturnSignal) {
        throw error.value
      }
    }
  }

  /* ---------------------------------------- */

  #evaluateExpression(n: any, scope: Scope): any {
    this.#bump()

    switch (n.type) {
      case 'Literal':
        return n.value

      case 'Identifier': {
        return scope.get(n.name)
      }

      case 'UnaryExpression': {
        const v = this.#evaluateExpression(n.argument, scope)

        switch (n.operator) {
          case '!':
            return !v
          case '+':
            return +v
          case '-':
            return -v
          default:
            throw new Error(`Unsupported unary operator: ${n.operator}`)
        }
      }

      case 'BinaryExpression': {
        const l = this.#evaluateExpression(n.left, scope)
        const r = this.#evaluateExpression(n.right, scope)

        switch (n.operator) {
          case '+':
            return l + r
          case '-':
            return l - r
          case '*':
            return l * r
          case '/':
            return l / r
          case '%':
            return l % r
          default:
            throw new Error(`Unsupported binary operator: ${n.operator}`)
        }
      }

      case 'CallExpression': {
        if (n.callee.type !== 'Identifier') throw new Error('Only direct function calls allowed')
        const func = scope.get(n.callee.name) as FuncValue

        if (!func || func.__kind !== 'function') throw new Error('Not a function')

        const args = n.arguments.map((arg: any) => this.#evaluateExpression(arg, scope))

        return this.#callFunc(func, args)
      }

      case 'MemberExpression': {
        if (n.computed) throw new Error('Computed member expressions not supported')
        const obj = this.#evaluateExpression(n.object, scope)

        if (!obj || typeof obj !== 'object') return undefined

        const prop = n.property.name

        if (prop === '__proto__' || prop === 'constructor' || prop === 'prototype') {
          throw new Error('Access to restricted property')
        }

        return obj[prop]
      }

      default:
        throw new Error(`Unsupported expression type: ${n.type}`)
    }
  }

  #parseScript(sourceCode: string): Program {
    return parse(sourceCode, { ecmaVersion: 'latest', sourceType: 'script' })
  }

  /* ---------------------------------------- */

  #runScript(program: Program): unknown {
    let lastValue: unknown = undefined

    for (const statement of program.body) {
      lastValue = this.#executeStatement(statement, this.#global)
    }

    return lastValue
  }
}

/* ---------------------------------------- */

export { ScriptInterpreter }
