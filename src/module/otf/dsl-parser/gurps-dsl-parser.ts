import { BasedNode, CostsNode, DSLInput, ModifierNode, PhraseNode, SkillType } from './types.js'

export class GurpsDSLParser {
  constructor(private input: string) {}

  parse(): DSLInput {
    const phrases = this.splitPhrases(this.input)

    return {
      phrases: phrases.map(phrase => this.parsePhrase(phrase)),
    }
  }

  // --- Phrase splitting (quote-aware) ---
  private splitPhrases(input: string): string[] {
    const result: string[] = []
    let current = ''
    let quote: string | null = null

    for (let i = 0; i < input.length; i++) {
      const char = input[i]

      if (quote) {
        if (char === '\\' && i + 1 < input.length) {
          current += char + input[++i]
          continue
        }

        if (char === quote) quote = null
        current += char
        continue
      }

      if (char === '"' || char === "'") {
        quote = char
        current += char
        continue
      }

      if (char === '|') {
        result.push(current.trim())
        current = ''
        continue
      }

      current += char
    }

    if (current) result.push(current.trim())

    return result
  }

  // --- Phrase parser ---
  private parsePhrase(text: string): PhraseNode {
    const ctx = { i: 0, text }

    this.skipWS(ctx)

    const type = this.readType(ctx)

    this.expect(ctx, ':')

    this.skipWS(ctx)
    const name = this.readName(ctx)

    this.skipWS(ctx)
    const modifier = this.readModifier(ctx)

    this.skipWS(ctx)
    const based = this.readBased(ctx)

    this.skipWS(ctx)
    const costs = this.readCosts(ctx)

    this.skipWS(ctx)
    const description = text.slice(ctx.i).trim() || undefined

    return {
      type,
      name,
      modifier,
      based,
      costs,
      description,
    }
  }

  // --- Helpers ---

  private skipWS(ctx: any) {
    while (/\s/.test(ctx.text[ctx.i])) ctx.i++
  }

  private expect(ctx: any, char: string) {
    if (ctx.text[ctx.i] !== char) {
      throw new Error(`Expected '${char}' at position ${ctx.i}`)
    }

    ctx.i++
  }

  private readType(ctx: any): SkillType {
    const match = /^(sk|sp|s)/i.exec(ctx.text.slice(ctx.i))

    if (!match) throw new Error('Invalid type')
    ctx.i += match[0].length

    const type = match[1].toLowerCase()

    return type === 's' ? 'skill-spell' : type === 'sk' ? 'skill' : 'spell'
  }

  private readName(ctx: any): string {
    const char = ctx.text[ctx.i]

    if (char === '"' || char === "'") {
      return this.readQuoted(ctx)
    }

    const start = ctx.i

    while (ctx.i < ctx.text.length && !/\s/.test(ctx.text[ctx.i])) {
      ctx.i++
    }

    return ctx.text.slice(start, ctx.i)
  }

  private readQuoted(ctx: any): string {
    const quote = ctx.text[ctx.i++]
    let result = ''

    while (ctx.i < ctx.text.length) {
      const char = ctx.text[ctx.i]

      if (char === '\\' && ctx.i + 1 < ctx.text.length) {
        result += ctx.text[ctx.i + 1]
        ctx.i += 2
        continue
      }

      if (char === quote) {
        ctx.i++
        break
      }

      result += char
      ctx.i++
    }

    return result
  }

  private readModifier(ctx: any): ModifierNode | undefined {
    const match = /^[+-](\d+|@margin)/i.exec(ctx.text.slice(ctx.i))

    if (!match) return undefined

    ctx.i += match[0].length

    if (match[1] === '@margin') {
      return {
        kind: 'margin',
        sign: match[0][0] as '+' | '-',
      }
    }

    return {
      kind: 'flat',
      value: parseInt(match[1], 10) * (match[0][0] === '-' ? -1 : 1),
    }
  }

  private readBased(ctx: any): BasedNode | undefined {
    const match = /^\(Based:\s*([^)]+)\)/i.exec(ctx.text.slice(ctx.i))

    if (!match) return undefined

    ctx.i += match[0].length

    return { value: match[1].trim() }
  }

  private readCosts(ctx: any): CostsNode | undefined {
    const match = /^\*\s*(per|costs)\s*(\d+)(.*)/i.exec(ctx.text.slice(ctx.i))

    if (!match) return undefined

    ctx.i += match[0].length

    return {
      keyword: match[1].toLowerCase() as 'per' | 'costs',
      amount: parseInt(match[2], 10),
      text: match[3].trim(),
    }
  }
}
