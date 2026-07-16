import { DamageTokenizer } from './tokenizer.js'
import { CostPhraseNode, DamageRollNode, DamageTermNode, DamageToken, DamageValueNode } from './types.js'

interface ParseContext {
  i: number
  tokens: DamageToken[]
}

/**
 * Parses raw GURPS damage terms according to the local EBNF damage grammar.
 */
export class DamageParser {
  parse(input: string): DamageTermNode {
    const tokens = new DamageTokenizer(input).tokenize()
    const filteredTokens = this.removeMarginTokens(tokens)
    const ctx: ParseContext = { i: 0, tokens: filteredTokens }

    this.readOptionalWhitespace(ctx)

    const roll = this.readDamageRoll(ctx)

    this.requireWhitespace(ctx, 'Expected whitespace before damage type')

    const type = this.readIdentifier(ctx, 'Expected damage type').toLowerCase()

    let extendedType: string | undefined

    if (this.hasWhitespaceAndIdentifier(ctx)) {
      this.readOptionalWhitespace(ctx)
      extendedType = this.readIdentifier(ctx, 'Expected extended damage type')
    }

    this.readOptionalWhitespace(ctx)
    const cost = this.readOptionalCostPhrase(ctx)

    this.readOptionalWhitespace(ctx)
    const hitLocation = this.readOptionalHitLocation(ctx)

    this.readOptionalWhitespace(ctx)

    if (!this.isAt(ctx, 'eof')) {
      const token = this.peek(ctx)

      throw new Error(`Unexpected token '${token.lexeme}' at position ${token.position}`)
    }

    const addMargin = tokens.some(token => token.type === 'margin')

    return {
      roll,
      type,
      extendedType,
      cost,
      hitLocation,
      addMargin,
      canonicalModifier: this.canonicalModifierText(roll, addMargin),
    }
  }

  private removeMarginTokens(tokens: DamageToken[]): DamageToken[] {
    return tokens.filter(token => token.type !== 'margin')
  }

  private readDamageRoll(ctx: ParseContext): DamageRollNode {
    const accumulate = this.consumeIf(ctx, 'plus')
    const value = this.readDamageValue(ctx)

    const modifier = this.readOptionalSegment(ctx, ['plus', 'minus'], () => this.readModifier(ctx))

    const multiplier = this.readOptionalSegment(ctx, ['times'], () => this.readMultiplier(ctx))

    const minimum = this.consumeIf(ctx, 'bang')

    const divisor = this.readOptionalSegment(ctx, ['lparen'], () => this.readDivisor(ctx))

    return {
      accumulate,
      value,
      modifier,
      multiplier,
      minimum,
      divisor,
    }
  }

  private readDamageValue(ctx: ParseContext): DamageValueNode {
    const current = this.peek(ctx)

    if (current.type === 'identifier') {
      const alias = this.next(ctx).lexeme.toLowerCase()

      if (alias === 'sw' || alias === 'swing') {
        return { kind: 'derived', basis: 'sw' }
      }

      if (alias === 'thr' || alias === 'thrust') {
        return { kind: 'derived', basis: 'thr' }
      }

      throw new Error(`Expected derived roll, found '${alias}'`)
    }

    if (current.type !== 'integer') {
      throw new Error(`Expected damage value at position ${current.position}`)
    }

    const count = this.readPositiveInteger(ctx)

    if (!this.consumeIf(ctx, 'd')) {
      return {
        kind: 'scalar',
        value: count,
      }
    }

    let sides: number | null = null

    if (this.isAt(ctx, 'integer')) {
      const rawSides = this.readPositiveInteger(ctx)

      sides = rawSides === 6 ? null : rawSides
    }

    return {
      kind: 'direct',
      dice: count,
      sides,
    }
  }

  private readModifier(ctx: ParseContext): number {
    const isNegative = this.consumeIf(ctx, 'minus')
    const isPositive = !isNegative && this.consumeIf(ctx, 'plus')

    if (!isNegative && !isPositive) {
      const token = this.peek(ctx)

      throw new Error(`Expected modifier sign at position ${token.position}`)
    }

    const value = this.readPositiveInteger(ctx)

    return isNegative ? -value : value
  }

  private readMultiplier(ctx: ParseContext): number {
    this.expect(ctx, 'times', 'Expected multiplier operator')

    return this.readDecimal(ctx)
  }

  private readDivisor(ctx: ParseContext): number {
    this.expect(ctx, 'lparen', "Expected '(' before divisor")

    const divisor = this.readDecimal(ctx)

    this.expect(ctx, 'rparen', "Expected ')' after divisor")

    return divisor
  }

  private readOptionalCostPhrase(ctx: ParseContext): CostPhraseNode | undefined {
    if (!this.isAt(ctx, 'costFlag')) return undefined

    const flagToken = this.next(ctx)
    const flag = flagToken.lexeme as '/' | '*per' | '*cost' | '*costs'

    this.readOptionalWhitespace(ctx)

    let amount: number | undefined

    if (this.isAt(ctx, 'integer')) {
      amount = this.readPositiveInteger(ctx)
      this.readOptionalWhitespace(ctx)
    }

    const pool = this.readPool(ctx)

    return {
      flag,
      amount,
      pool,
    }
  }

  private readOptionalHitLocation(ctx: ParseContext): string | undefined {
    if (!this.isAt(ctx, 'hitLocation')) return undefined

    return this.next(ctx).lexeme.slice(1)
  }

  private readPool(ctx: ParseContext): string {
    const token = this.peek(ctx)

    if (token.type === 'pool' || token.type === 'identifier' || token.type === 'hitLocation') {
      return this.next(ctx).lexeme
    }

    throw new Error(`Expected cost pool at position ${token.position}`)
  }

  private readIdentifier(ctx: ParseContext, errorMessage: string): string {
    const token = this.peek(ctx)

    if (token.type !== 'identifier') {
      throw new Error(`${errorMessage} at position ${token.position}`)
    }

    return this.next(ctx).lexeme
  }

  private readPositiveInteger(ctx: ParseContext): number {
    const token = this.peek(ctx)

    if (token.type !== 'integer') {
      throw new Error(`Expected positive integer at position ${token.position}`)
    }

    return parseInt(this.next(ctx).lexeme, 10)
  }

  private readDecimal(ctx: ParseContext): number {
    const token = this.peek(ctx)

    if (token.type !== 'integer' && token.type !== 'decimal') {
      throw new Error(`Expected decimal at position ${token.position}`)
    }

    return parseFloat(this.next(ctx).lexeme)
  }

  private requireWhitespace(ctx: ParseContext, message: string): void {
    if (!this.isAt(ctx, 'whitespace')) {
      const token = this.peek(ctx)

      throw new Error(`${message} at position ${token.position}`)
    }

    this.readOptionalWhitespace(ctx)
  }

  private readOptionalWhitespace(ctx: ParseContext): void {
    while (this.isAt(ctx, 'whitespace')) {
      this.next(ctx)
    }
  }

  private hasWhitespaceAndIdentifier(ctx: ParseContext): boolean {
    return this.isAt(ctx, 'whitespace') && this.lookahead(ctx, 1).type === 'identifier'
  }

  private readOptionalSegment<T>(ctx: ParseContext, startTypes: DamageToken['type'][], reader: () => T): T | undefined {
    const start = ctx.i

    this.readOptionalWhitespace(ctx)

    if (!startTypes.includes(this.peek(ctx).type)) {
      ctx.i = start

      return undefined
    }

    return reader()
  }

  private canonicalModifierText(roll: DamageRollNode, addMargin: boolean): string {
    const modifierParts: string[] = []

    if (roll.modifier !== undefined) {
      modifierParts.push(roll.modifier >= 0 ? `+${roll.modifier}` : `${roll.modifier}`)
    }

    if (addMargin) {
      modifierParts.push('+@margin')
    }

    return modifierParts.join('')
  }

  private consumeIf(ctx: ParseContext, type: DamageToken['type']): boolean {
    if (!this.isAt(ctx, type)) return false

    this.next(ctx)

    return true
  }

  private expect(ctx: ParseContext, type: DamageToken['type'], message: string): void {
    if (!this.isAt(ctx, type)) {
      const token = this.peek(ctx)

      throw new Error(`${message} at position ${token.position}`)
    }

    this.next(ctx)
  }

  private isAt(ctx: ParseContext, type: DamageToken['type']): boolean {
    return this.peek(ctx).type === type
  }

  private lookahead(ctx: ParseContext, offset: number): DamageToken {
    return ctx.tokens[ctx.i + offset] ?? ctx.tokens[ctx.tokens.length - 1]
  }

  private peek(ctx: ParseContext): DamageToken {
    return this.lookahead(ctx, 0)
  }

  private next(ctx: ParseContext): DamageToken {
    const token = this.peek(ctx)

    ctx.i++

    return token
  }
}
