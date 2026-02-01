import { BlockStatement, ModuleDeclaration, parse, Program, Statement } from '../../scripts/acorn.mjs'

import { Scope, VarKind } from './scope.ts'
import { BreakSignal, ContinueSignal, ReturnSignal } from './signals.ts'
import { ScriptEnvironment, ScriptErrResult, ScriptResult } from './types.ts'

type FuncValue = {
  __kind: 'function'
  name?: string
  params: string[]
  body: BlockStatement
  scope: Scope
}

/* ---------------------------------------- */

class ScriptInterpreter {
  static MAX_STEPS = 20_000

  #steps: number
  #global: Scope

  /* ---------------------------------------- */

  static runScript(script: string, initialEnv: ScriptEnvironment): ScriptResult {
    const interpreter = new ScriptInterpreter(initialEnv)

    try {
      const program = interpreter.#parseScript(script)

      return interpreter.#runScript(program)
    } catch (error) {
      return interpreter.#toErrorResult(error)
    }
  }

  /* ---------------------------------------- */

  constructor(initialEnv: ScriptEnvironment) {
    this.#steps = 0
    this.#global = new Scope()
    for (const [key, value] of Object.entries(initialEnv)) this.#global.define(key, 'const', value)
  }

  /* ---------------------------------------- */

  #toErrorResult(e: any): ScriptErrResult {
    const err: ScriptErrResult['error'] = {
      name: e?.name ?? 'Error',
      message: e?.message ?? String(e),
    }

    if (typeof e?.pos === 'number') err.start = (e as any).pos
    if (typeof e?.raisedAt === 'number') err.end = (e as any).raisedAt

    if (e?.loc) {
      err.line = e.loc.line
      err.column = (e.loc.column ?? 0) + 1
    }

    if (e?.__nodeLoc) {
      const n = e.__nodeLoc

      err.start ??= n.start
      err.end ??= n.end

      if (n.loc?.start) {
        err.line ??= n.loc.start.line
        err.column ??= (n.loc.start.column ?? 0) + 1
      }
    }

    console.trace()

    return { ok: false, error: err }
  }

  /* ---------------------------------------- */

  #attachNodeContext(e: any, node: any): void {
    try {
      e.__nodeLoc = { start: node.start, end: node.end, loc: node.loc }
    } catch {
      // Do nothing
    }

    return e
  }

  /* ---------------------------------------- */

  #bump(): void {
    this.#steps++
    if (this.#steps > ScriptInterpreter.MAX_STEPS) throw new Error('Maximum execution steps exceeded')
  }

  /* ---------------------------------------- */

  #isForbiddenProp(prop: string): boolean {
    return prop === '__proto__' || prop === 'constructor' || prop === 'prototype'
  }

  /* ---------------------------------------- */

  #executeBlock(statements: any[], scope: Scope): unknown {
    let last: unknown = undefined

    for (const stmt of statements) last = this.#executeStatement(stmt, scope)

    return last
  }

  /* ---------------------------------------- */

  #executeStatement(n: Statement | ModuleDeclaration, scope: Scope): unknown {
    this.#bump()

    try {
      switch (n.type) {
        case 'EmptyStatement':
          return undefined

        case 'BlockStatement': {
          const inner = new Scope(scope)

          return this.#executeBlock(n.body, inner)
        }

        case 'ExpressionStatement': {
          return this.#evaluateExpression(n.expression, scope)
        }

        case 'ReturnStatement': {
          const v = n.argument ? this.#evaluateExpression(n.argument, scope) : undefined

          throw new ReturnSignal(v)
        }

        case 'BreakStatement':
          throw new BreakSignal(n.label ? n.label.name : undefined)

        case 'ContinueStatement':
          throw new ContinueSignal(n.label ? n.label.name : undefined)

        case 'IfStatement': {
          const test = this.#evaluateExpression(n.test, scope)

          if (test) return this.#executeStatement(n.consequent, scope)
          if (test === false && n.alternate) return this.#executeStatement(n.alternate, scope)

          return undefined
        }

        case 'VariableDeclaration': {
          const kind: VarKind = n.kind // 'var', 'let', or 'const'

          for (const decl of n.declarations) {
            if (decl.id.type !== 'Identifier') throw new Error('Only simple variable declarations are supported')
            const name = decl.id.name

            const value = decl.init ? this.#evaluateExpression(decl.init, scope) : undefined

            if (scope.hasHere(name) && kind !== 'var') {
              throw new Error(`Variable '${name}' has already been declared`)
            }

            scope.define(name, kind, value)
          }

          return undefined
        }

        case 'FunctionDeclaration': {
          const name = n.id.name

          if (!name) throw new Error('Anonymous function declarations are not supported')

          const params = n.params.map(param => {
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

          scope.define(name, 'const', func)

          return undefined
        }

        case 'WhileStatement': {
          while (this.#evaluateExpression(n.test, scope)) {
            try {
              this.#executeStatement(n.body, scope)
            } catch (sig) {
              if (sig instanceof ContinueSignal) continue
              if (sig instanceof BreakSignal) break
              throw sig
            }

            this.#bump()
          }

          return undefined
        }

        case 'ForStatement': {
          const loopScope = new Scope(scope)

          if (n.init) {
            if (n.init.type === 'VariableDeclaration') this.#executeStatement(n.init, loopScope)
            else this.#evaluateExpression(n.init, loopScope)
          }

          while (n.test ? this.#evaluateExpression(n.test, loopScope) : true) {
            try {
              this.#executeStatement(n.body, loopScope)
            } catch (sig) {
              if (sig instanceof ContinueSignal) {
                // continue => still run update
              } else if (sig instanceof BreakSignal) {
                break
              } else {
                throw sig
              }
            }

            if (n.update) this.#evaluateExpression(n.update, loopScope)
            this.#bump()
          }

          return undefined
        }

        case 'SwitchStatement': {
          const discriminant = this.#evaluateExpression(n.discriminant, scope)

          let matched = false
          let last: unknown = undefined

          for (const switchCase of n.cases) {
            if (!matched) {
              if (!switchCase.test) {
                matched = true // default case
              } else {
                const testValue = this.#evaluateExpression(switchCase.test, scope)

                if (testValue === discriminant) matched = true
              }
            }

            if (matched) {
              try {
                last = this.#executeBlock(switchCase.consequent, scope)
              } catch (sig) {
                if (sig instanceof BreakSignal) return last

                throw sig
              }
            }
          }

          return last
        }

        default:
          throw new Error(`Unsupported statement type: ${n.type}`)
      }
    } catch (e) {
      throw this.#attachNodeContext(e, n)
    }
  }

  /* ---------------------------------------- */

  #callFunc(func: FuncValue, args: unknown[]): unknown {
    this.#bump()

    const callScope = new Scope(func.scope)

    for (let i = 0; i < func.params.length; i++) {
      callScope.define(func.params[i], 'let', args[i])
    }

    try {
      return this.#executeBlock(func.body.body, callScope)
    } catch (sig) {
      if (sig instanceof ReturnSignal) return sig.value
      throw sig
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

      case 'ThisExpression':
        throw new Error('`this` is not allowed')

      case 'ArrayExpression':
        return n.elements.map((e: any) => (e ? this.#evaluateExpression(e, scope) : undefined))

      case 'ObjectExpression': {
        const out: Record<string, unknown> = {}

        for (const p of n.properties) {
          if (p.type !== 'Property' || p.computed) throw new Error('Illegal object literal')
          const key =
            p.key.type === 'Identifier'
              ? p.key.name
              : p.key.type === 'Literal'
                ? String(p.key.value)
                : (() => {
                    throw new Error('Illegal object key')
                  })()

          if (this.#isForbiddenProp(key)) throw new Error('Illegal object key')
          out[key] = this.#evaluateExpression(p.value, scope)
        }

        return out
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

      case 'UpdateExpression': {
        if (n.argument.type !== 'Identifier') throw new Error('Illegal update target')
        const name = n.argument.name
        const current = scope.get(name)

        if (current === undefined) throw new Error(`Variable '${name}' is not defined`)

        if (typeof current !== 'number') {
          throw new Error('Can only increment or decrement numeric values')
        }

        const next = n.operator === '++' ? +current + 1 : +current - 1

        scope.assign(name, next)

        return n.prefix ? next : current
      }

      case 'AssignmentExpression': {
        // a = b, a += b, etc.
        if (n.left.type !== 'Identifier') throw new Error('Illegal assignment target')
        const name = n.left.name
        const right = this.#evaluateExpression(n.right, scope)

        if (n.operator === '=') {
          scope.assign(name, right)

          return right
        }

        const cur = scope.get(name)
        let next: any

        switch (n.operator) {
          case '+=':
            next = (cur as any) + (right as any)
            break
          case '-=':
            next = (cur as any) - (right as any)
            break
          case '*=':
            next = (cur as any) * (right as any)
            break
          case '/=':
            next = (cur as any) / (right as any)
            break
          case '%=':
            next = (cur as any) % (right as any)
            break
          default:
            throw new Error('Illegal assignment operator')
        }

        scope.assign(name, next)

        return next
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

      case 'LogicalExpression': {
        if (n.operator === '&&') {
          const l = this.#evaluateExpression(n.left, scope)

          return l && this.#evaluateExpression(n.right, scope)
        }

        if (n.operator === '||') {
          const l = this.#evaluateExpression(n.left, scope)

          return l || this.#evaluateExpression(n.right, scope)
        }

        throw new Error('Illegal logical operator')
      }

      case 'ConditionalExpression': {
        const t = this.#evaluateExpression(n.test, scope)

        return t ? this.#evaluateExpression(n.consequent, scope) : this.#evaluateExpression(n.alternate, scope)
      }

      case 'MemberExpression': {
        if (n.computed) throw new Error('Computed member access is not allowed')
        const obj = this.#evaluateExpression(n.object, scope)

        if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return undefined

        const prop = n.property.name as string

        if (this.#isForbiddenProp(prop)) throw new Error('Illegal property access')

        return obj[prop]
      }

      case 'CallExpression': {
        let callee: any
        let thisArg: any = undefined

        if (n.callee.type === 'Identifier') {
          callee = scope.get(n.callee.name)
        } else if (n.callee.type === 'MemberExpression' && !n.callee.computed) {
          const obj = this.#evaluateExpression(n.callee.object, scope)
          const prop = n.callee.property.name as string

          if (this.#isForbiddenProp(prop)) throw new Error('Illegal member call')
          thisArg = obj
          callee = obj?.[prop]
        } else {
          throw new Error('Illegal call target')
        }

        const args = n.arguments.map((a: any) => this.#evaluateExpression(a, scope))

        if (callee && callee.__kind === 'function') {
          return this.#callFunc(callee, args)
        }

        if (typeof callee === 'function') {
          return callee.apply(thisArg, args)
        }

        throw new Error('Not a function')
      }

      default:
        throw new Error(`Unsupported expression type: ${n.type}`)
    }
  }

  #parseScript(sourceCode: string): Program {
    return parse(sourceCode, { ecmaVersion: 'latest', sourceType: 'script' })
  }

  /* ---------------------------------------- */

  #runScript(program: Program): ScriptResult {
    let lastValue: unknown = undefined

    try {
      for (const statement of program.body) {
        lastValue = this.#executeStatement(statement, this.#global)
      }
    } catch (sig) {
      if (sig instanceof ReturnSignal) lastValue = sig.value
      else throw sig
    }

    return { ok: true, value: lastValue }
  }
}

/* ---------------------------------------- */

export { ScriptInterpreter }
