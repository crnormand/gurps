import { DamageToken } from './types.js'

const DERIVED_ALIAS_REGEX = /^(swing|sw|thrust|thr)/i
const DECIMAL_REGEX = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d+)/
const INTEGER_REGEX = /^[1-9]\d*/
const COST_FLAG_REGEX = /^(?:\*per|\*costs|\*cost|\/)/i
const IDENTIFIER_REGEX = /^[A-Za-z][A-Za-z0-9_-]*/
const HIT_LOCATION_REGEX = /^@[^\s]+/
const POOL_REGEX = /^[^\s]+/

/**
 * Tokenizes a raw damage term while preserving whitespace as explicit tokens.
 */
export class DamageTokenizer {
  private i = 0

  constructor(private readonly input: string) {}

  tokenize(): DamageToken[] {
    const tokens: DamageToken[] = []

    while (this.i < this.input.length) {
      const start = this.i
      const remaining = this.input.slice(this.i)
      const char = remaining[0]

      if (/^\s+/.test(remaining)) {
        const ws = this.readMatch(/^\s+/)!

        tokens.push({ type: 'whitespace', lexeme: ws, position: start })
        continue
      }

      const margin = this.readMatch(/^\+@margin/i)
      if (margin) {
        tokens.push({ type: 'margin', lexeme: margin, position: start })
        continue
      }

      const hitLocation = this.readMatch(HIT_LOCATION_REGEX)
      if (hitLocation) {
        tokens.push({ type: 'hitLocation', lexeme: hitLocation, position: start })
        continue
      }

      const costFlag = this.readMatch(COST_FLAG_REGEX)
      if (costFlag) {
        tokens.push({ type: 'costFlag', lexeme: costFlag.toLowerCase(), position: start })
        continue
      }

      if (char === '(') {
        this.i++
        tokens.push({ type: 'lparen', lexeme: '(', position: start })
        continue
      }

      if (char === ')') {
        this.i++
        tokens.push({ type: 'rparen', lexeme: ')', position: start })
        continue
      }

      if (char === '+') {
        this.i++
        tokens.push({ type: 'plus', lexeme: '+', position: start })
        continue
      }

      if (char === '-' || char === '\u2212' || char === '\u2013') {
        this.i++
        tokens.push({ type: 'minus', lexeme: '-', position: start })
        continue
      }

      if (char === '*' || char === 'x' || char === 'X' || char === '\u00D7') {
        this.i++
        tokens.push({ type: 'times', lexeme: '*', position: start })
        continue
      }

      if (char === '!') {
        this.i++
        tokens.push({ type: 'bang', lexeme: '!', position: start })
        continue
      }

      const nextChar = remaining[1] ?? ''
      if ((char === 'd' || char === 'D') && /^(?:$|\d|\s|[+\-\u2212\u2013*xX\u00D7!()\/])$/.test(nextChar)) {
        this.i++
        tokens.push({ type: 'd', lexeme: 'd', position: start })
        continue
      }

      const decimal = this.readMatch(DECIMAL_REGEX)
      if (decimal) {
        tokens.push({ type: decimal.includes('.') ? 'decimal' : 'integer', lexeme: decimal, position: start })
        continue
      }

      const integer = this.readMatch(INTEGER_REGEX)
      if (integer) {
        tokens.push({ type: 'integer', lexeme: integer, position: start })
        continue
      }

      const derived = this.readMatch(DERIVED_ALIAS_REGEX)
      if (derived) {
        tokens.push({ type: 'identifier', lexeme: derived, position: start })
        continue
      }

      const identifier = this.readMatch(IDENTIFIER_REGEX)
      if (identifier) {
        tokens.push({ type: 'identifier', lexeme: identifier, position: start })
        continue
      }

      const pool = this.readMatch(POOL_REGEX)
      if (pool) {
        tokens.push({ type: 'pool', lexeme: pool, position: start })
        continue
      }

      throw new Error(`Unexpected token at position ${start}`)
    }

    tokens.push({ type: 'eof', lexeme: '', position: this.i })

    return tokens
  }

  private readMatch(regex: RegExp): string | null {
    const match = regex.exec(this.input.slice(this.i))

    if (!match) return null

    this.i += match[0].length

    return match[0]
  }
}
