import { BlockStatement, ModuleDeclaration, parse, Program, Statement, Node, Expression } from '@lib/acorn.mjs'
import { AnyObject } from 'fvtt-types/utils'

import { Scope, VarKind } from './scope.js'
import { BreakSignal, ContinueSignal, ReturnSignal } from './signals.js'
import {
  asNodeLocContext,
  asThrownDetails,
  isRecord,
  NodeLocContext,
  ScriptEnvironment,
  ScriptErrResult,
  ScriptResult,
} from './types.ts'

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
    } catch (error: unknown) {
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

  #toErrorResult(thrown: unknown): ScriptErrResult {
    const details = asThrownDetails(thrown)
    const err: ScriptErrResult['error'] = {
      name: thrown instanceof Error ? thrown.name : typeof details?.name === 'string' ? details.name : 'Error',
      message:
        thrown instanceof Error
          ? thrown.message
          : typeof details?.message === 'string'
            ? details.message
            : String(thrown),
    }

    if (typeof details?.pos === 'number') err.start = details.pos
    if (typeof details?.raisedAt === 'number') err.end = details.raisedAt

    if (isRecord(details?.loc)) {
      const line = (details!.loc as any).line
      const column = (details!.loc as any).column

      if (typeof line === 'number') err.line = line
      if (typeof column === 'number') err.column = column + 1
    }

    const nodeLoc = asNodeLocContext(details?.__nodeLoc)

    if (nodeLoc) {
      err.start ??= nodeLoc.start
      err.end ??= nodeLoc.end
      const line = nodeLoc.loc?.start?.line
      const column = nodeLoc.loc?.start?.column

      if (typeof line === 'number') err.line ??= line
      if (typeof column === 'number') err.column ??= column + 1
    }

    return { ok: false, error: err }
  }

  /* ---------------------------------------- */

  #attachNodeContext<T>(thrown: T, node: Node): T {
    if (!isRecord(thrown)) return thrown

    try {
      ;(thrown as Record<string, unknown> & { __nodeLoc?: NodeLocContext }).__nodeLoc = {
        start: node.start,
        end: node.end,
        loc: node.loc,
      }
    } catch {
      // ignore (frozen objects, etc.)
    }

    return thrown
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

  #executeBlock(statements: Statement[], scope: Scope): unknown {
    let last = undefined

    for (const stmt of statements) last = this.#executeStatement(stmt, scope)

    return last
  }

  /* ---------------------------------------- */

  #executeStatement(node: Statement | ModuleDeclaration, scope: Scope): unknown {
    this.#bump()

    try {
      switch (node.type) {
        case 'EmptyStatement':
          return undefined

        case 'BlockStatement': {
          const inner = new Scope(scope)

          return this.#executeBlock(node.body, inner)
        }

        case 'ExpressionStatement': {
          return this.#evaluateExpression(node.expression, scope)
        }

        case 'ReturnStatement': {
          const returnValue = node.argument ? this.#evaluateExpression(node.argument, scope) : undefined

          throw new ReturnSignal(returnValue)
        }

        case 'BreakStatement':
          throw new BreakSignal(node.label ? node.label.name : undefined)

        case 'ContinueStatement':
          throw new ContinueSignal(node.label ? node.label.name : undefined)

        case 'IfStatement': {
          const test = this.#evaluateExpression(node.test, scope)

          if (test) return this.#executeStatement(node.consequent, scope)
          if (node.alternate) return this.#executeStatement(node.alternate, scope)

          return undefined
        }

        case 'VariableDeclaration': {
          const kind: VarKind = node.kind // 'var', 'let', or 'const'

          for (const decl of node.declarations) {
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
          const name = node.id.name

          if (!name) throw new Error('Anonymous function declarations are not supported')

          const params = node.params.map(param => {
            if (param.type !== 'Identifier') throw new Error('Only simple parameters are supported')

            return param.name
          })

          const func: FuncValue = {
            __kind: 'function',
            name,
            params,
            body: node.body,
            scope,
          }

          scope.define(name, 'const', func)

          return undefined
        }

        case 'WhileStatement': {
          while (this.#evaluateExpression(node.test, scope)) {
            try {
              this.#executeStatement(node.body, scope)
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

          if (node.init) {
            if (node.init.type === 'VariableDeclaration') this.#executeStatement(node.init, loopScope)
            else this.#evaluateExpression(node.init, loopScope)
          }

          while (node.test ? this.#evaluateExpression(node.test, loopScope) : true) {
            try {
              this.#executeStatement(node.body, loopScope)
            } catch (sig) {
              if (sig instanceof ContinueSignal) {
                // continue => still run update
              } else if (sig instanceof BreakSignal) {
                break
              } else {
                throw sig
              }
            }

            if (node.update) this.#evaluateExpression(node.update, loopScope)
            this.#bump()
          }

          return undefined
        }

        case 'SwitchStatement': {
          const discriminant = this.#evaluateExpression(node.discriminant, scope)

          let matched = false
          let last = undefined

          for (const switchCase of node.cases) {
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
          throw new Error(`Unsupported statement type: ${node.type}`)
      }
    } catch (error) {
      throw this.#attachNodeContext(error, node)
    }
  }

  /* ---------------------------------------- */

  #callFunc(func: FuncValue, args: unknown[]): unknown {
    this.#bump()

    const callScope = new Scope(func.scope)

    for (let i = 0; i < func.params.length; i++) {
      const paramName = func.params[i]

      callScope.define(paramName, 'let', args[i])
    }

    try {
      return this.#executeBlock(func.body.body, callScope)
    } catch (sig) {
      if (sig instanceof ReturnSignal) return sig.value
      throw sig
    }
  }

  /* ---------------------------------------- */

  #evaluateExpression(node: Expression, scope: Scope): unknown {
    this.#bump()

    switch (node.type) {
      case 'Literal':
        return node.value

      case 'Identifier': {
        return scope.get(node.name)
      }

      case 'ThisExpression':
        throw new Error('`this` is not allowed')

      case 'ArrayExpression': {
        const out: unknown[] = []

        for (const element of node.elements) {
          if (!element) {
            out.push(undefined)
            continue
          }

          if (element.type === 'SpreadElement') {
            const spreadValue = this.#evaluateExpression(element.argument, scope)

            if (Array.isArray(spreadValue)) {
              for (const item of spreadValue) {
                out.push(item)
                this.#bump()
              }

              continue
            }

            if (typeof spreadValue === 'string') {
              for (const character of spreadValue) {
                out.push(character)
                this.#bump()
              }

              continue
            }

            throw new Error('Can only spread arrays or strings')
          }

          out.push(this.#evaluateExpression(element, scope))
        }

        return out
      }

      case 'ObjectExpression': {
        const out: Record<string, unknown> = {}

        for (const property of node.properties) {
          if (property.type !== 'Property' || property.computed) throw new Error('Illegal object literal')
          const key =
            property.key.type === 'Identifier'
              ? property.key.name
              : property.key.type === 'Literal'
                ? String(property.key.value)
                : (() => {
                    throw new Error('Illegal object key')
                  })()

          if (this.#isForbiddenProp(key)) throw new Error('Illegal object key')
          out[key] = this.#evaluateExpression(property.value, scope)
        }

        return out
      }

      case 'UnaryExpression': {
        const value = this.#evaluateExpression(node.argument, scope)

        switch (node.operator) {
          case '!':
            return !value
          case '+':
            return Number(value)
          case '-':
            return -Number(value)
          default:
            throw new Error(`Unsupported unary operator: ${node.operator}`)
        }
      }

      case 'UpdateExpression': {
        if (node.argument.type !== 'Identifier') throw new Error('Illegal update target')
        const name = node.argument.name
        const current = scope.get(name)

        if (current === undefined) throw new Error(`Variable '${name}' is not defined`)

        if (typeof current !== 'number') {
          throw new Error('Can only increment or decrement numeric values')
        }

        const next = node.operator === '++' ? +current + 1 : +current - 1

        scope.assign(name, next)

        return node.prefix ? next : current
      }

      case 'AssignmentExpression': {
        if (node.left.type !== 'Identifier') throw new Error('Illegal assignment target')
        const name = node.left.name
        const right = this.#evaluateExpression(node.right, scope)

        if (node.operator === '=') {
          scope.assign(name, right)

          return right
        }

        const current = scope.get(name)
        let next: unknown

        switch (node.operator) {
          case '+=': {
            if (typeof current === 'string' || typeof right === 'string') next = String(current) + String(right)
            else next = Number(current) + Number(right)
            break
          }
          case '-=':
            next = Number(current) - Number(right)
            break
          case '*=':
            next = Number(current) * Number(right)
            break
          case '/=':
            next = Number(current) / Number(right)
            break
          case '%=':
            next = Number(current) % Number(right)
            break
          default:
            throw new Error('Illegal assignment operator')
        }

        scope.assign(name, next)

        return next
      }

      case 'BinaryExpression': {
        const leftNode = node.left
        const rightNode = node.right

        if (leftNode.type === 'PrivateIdentifier' || (rightNode as any).type === 'PrivateIdentifier') {
          throw new Error('Private identifiers are not supported')
        }

        const left = this.#evaluateExpression(leftNode, scope)
        const right = this.#evaluateExpression(rightNode, scope)

        switch (node.operator) {
          case '+': {
            if (typeof left === 'string' || typeof right === 'string') return String(left) + String(right)

            return Number(left) + Number(right)
          }
          case '-':
            return Number(left) - Number(right)
          case '*':
            return Number(left) * Number(right)
          case '/':
            return Number(left) / Number(right)
          case '%':
            return Number(left) % Number(right)
          default:
            throw new Error(`Unsupported binary operator: ${node.operator}`)
        }
      }

      case 'LogicalExpression': {
        if (node.operator === '&&') {
          const left = this.#evaluateExpression(node.left, scope)

          return left && this.#evaluateExpression(node.right, scope)
        }

        if (node.operator === '||') {
          const left = this.#evaluateExpression(node.left, scope)

          return left || this.#evaluateExpression(node.right, scope)
        }

        throw new Error('Illegal logical operator')
      }

      case 'ConditionalExpression': {
        const test = this.#evaluateExpression(node.test, scope)

        return test ? this.#evaluateExpression(node.consequent, scope) : this.#evaluateExpression(node.alternate, scope)
      }

      case 'MemberExpression': {
        if (node.computed) throw new Error('Computed member access is not allowed')
        if (node.object.type === 'Super') throw new Error('super member access is not supported')

        if (node.property.type === 'PrivateIdentifier') {
          throw new Error('Private identifiers are not supported')
        }

        if (node.property.type !== 'Identifier') {
          throw new Error('Illegal member access')
        }

        const obj = this.#evaluateExpression(node.object, scope)

        if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return undefined
        const prop = node.property.name

        if (this.#isForbiddenProp(prop)) throw new Error('Illegal property access')

        return (obj as AnyObject)[prop]
      }

      case 'CallExpression': {
        let callee: unknown
        let thisArg: unknown = undefined

        if (node.callee.type === 'Identifier') {
          const calleeName = node.callee.name

          callee = scope.get(calleeName)
        } else if (node.callee.type === 'MemberExpression' && !node.callee.computed) {
          if (node.callee.object.type === 'Super') throw new Error('super member calls are not supported')

          if (node.callee.property.type === 'PrivateIdentifier')
            throw new Error('Private identifiers are not supported')

          if (node.callee.property.type !== 'Identifier') throw new Error('Illegal call target')

          const obj = this.#evaluateExpression(node.callee.object, scope)
          const propName = node.callee.property.name

          if (this.#isForbiddenProp(propName)) throw new Error('Illegal member call')
          thisArg = obj
          callee = (obj as AnyObject)?.[propName]
        } else {
          throw new Error('Illegal call target')
        }

        const args: unknown[] = []

        for (const arg of node.arguments) {
          if (arg.type === 'SpreadElement') {
            const spreadValue = this.#evaluateExpression(arg.argument, scope)

            if (Array.isArray(spreadValue)) {
              for (const item of spreadValue) {
                args.push(item)
                this.#bump()
              }

              continue
            }

            if (typeof spreadValue === 'string') {
              for (const ch of spreadValue) {
                args.push(ch)
                this.#bump()
              }

              continue
            }

            throw new Error('Can only spread arrays or strings')
          }

          args.push(this.#evaluateExpression(arg, scope))
        }

        if (callee && (callee as AnyObject).__kind === 'function') return this.#callFunc(callee as any, args)
        if (typeof callee === 'function') return callee.apply(thisArg, args)
        throw new Error('Not a function')
      }

      default:
        throw new Error(`Unsupported expression type: ${node.type}`)
    }
  }

  #parseScript(sourceCode: string): Program {
    return parse(sourceCode, { ecmaVersion: 'latest', sourceType: 'script', locations: true, ranges: true })
  }

  /* ---------------------------------------- */

  #runScript(program: Program): ScriptResult {
    let lastValue = undefined

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
