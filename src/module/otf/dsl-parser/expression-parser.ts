// expression-parser.ts

import { ExprNode, NumberNode, VariableNode } from './expression-ast.js'

export class ExpressionParser {
  private i = 0

  constructor(private input: string) {}

  parse(): ExprNode {
    const expr = this.parseExpression()

    this.skipWS()

    return expr
  }

  // -------------------------
  // Grammar
  // -------------------------

  private parseExpression(): ExprNode {
    return this.parseAddSub()
  }

  private parseAddSub(): ExprNode {
    let node = this.parseMulDiv()

    while (true) {
      this.skipWS()
      const op = this.peek()

      if (op !== '+' && op !== '-') break

      this.i++
      const right = this.parseMulDiv()

      node = {
        kind: 'binary',
        op,
        left: node,
        right,
      }
    }

    return node
  }

  private parseMulDiv(): ExprNode {
    let node = this.parseUnary()

    while (true) {
      this.skipWS()
      const op = this.peek()

      if (op !== '*' && op !== '/') break

      this.i++
      const right = this.parseUnary()

      node = {
        kind: 'binary',
        op,
        left: node,
        right,
      }
    }

    return node
  }

  private parseUnary(): ExprNode {
    this.skipWS()

    if (this.peek() === '-') {
      this.i++

      return {
        kind: 'unary',
        op: '-',
        expr: this.parseUnary(),
      }
    }

    return this.parsePrimary()
  }

  private parsePrimary(): ExprNode {
    this.skipWS()

    const char = this.peek()

    // Number
    if (/\d/.test(char)) {
      return this.readNumber()
    }

    // Variable (@margin)
    if (char === '@') {
      return this.readVariable()
    }

    // Identifier (function)
    if (/[a-zA-Z_]/.test(char)) {
      return this.readIdentifierOrCall()
    }

    // Parentheses
    if (char === '(') {
      this.i++
      const expr = this.parseExpression()

      this.expect(')')

      return expr
    }

    throw new Error(`Unexpected character '${char}'`)
  }

  // -------------------------
  // Readers
  // -------------------------

  private readNumber(): NumberNode {
    const start = this.i

    while (/\d/.test(this.peek())) this.i++

    return {
      kind: 'number',
      value: parseInt(this.input.slice(start, this.i), 10),
    }
  }

  private readVariable(): VariableNode {
    this.i++ // skip @
    const start = this.i

    while (/[a-zA-Z_]/.test(this.peek())) this.i++

    return {
      kind: 'variable',
      name: this.input.slice(start, this.i),
    }
  }

  private readIdentifierOrCall(): ExprNode {
    const start = this.i

    while (/[a-zA-Z_]/.test(this.peek())) this.i++

    const name = this.input.slice(start, this.i)

    this.skipWS()

    // Function call
    if (this.peek() === '(') {
      this.i++ // (

      const args: ExprNode[] = []

      while (true) {
        this.skipWS()
        if (this.peek() === ')') break

        args.push(this.parseExpression())

        this.skipWS()

        if (this.peek() === ',') {
          this.i++
          continue
        }

        break
      }

      this.expect(')')

      return {
        kind: 'call',
        name,
        args,
      }
    }

    // Treat bare identifiers as variables (optional design choice)
    return {
      kind: 'variable',
      name,
    }
  }

  // -------------------------
  // Helpers
  // -------------------------

  private skipWS() {
    while (/\s/.test(this.peek())) this.i++
  }

  private peek(): string {
    return this.input[this.i] || ''
  }

  private expect(char: string) {
    if (this.peek() !== char) {
      throw new Error(`Expected '${char}'`)
    }

    this.i++
  }
}
