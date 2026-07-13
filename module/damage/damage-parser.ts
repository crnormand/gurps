export const DAMAGE_TYPES = [
  'aff',
  'burn',
  'cor',
  'cr',
  'cut',
  'fat',
  'imp',
  'kb',
  'pi-',
  'pi',
  'pi+',
  'pi++',
  'spec.',
  'tox',
] as const

export const DAMAGE_COST_FLAGS = ['/', '*per', '*cost', '*costs'] as const

export type DamageCostFlag = (typeof DAMAGE_COST_FLAGS)[number]

export type DamageCostPhrase = {
  flag: DamageCostFlag
  amount: number
  pool: string
}

export type DamageTerm = {
  original: string
  accumulator: boolean
  dice: number | null
  usesDice: boolean
  sides: number | null
  derivedRoll: 'sw' | 'thr' | null
  bang: boolean
  modifier: number
  multiplier: number | null
  divisor: number | null
  type: string
  extendedType: string | null
  cost: DamageCostPhrase | null
  addMargin: boolean
  hitLocation: string | null
}

const DECIMAL_PATTERN = '(?:0\\.\\d+|[1-9]\\d*(?:\\.\\d*)?)'
const IDENTIFIER_PATTERN = '[A-Za-z][A-Za-z0-9_+\\-.]*'
const DERIVED_ROLL_PATTERN = '(?:sw|swing|thr|thrust|trust)'
const DAMAGE_TERM_REGEX = new RegExp(
  [
    '^\\s*',
    '(?<accumulator>\\+)?',
    `(?:(?<derivedRoll>${DERIVED_ROLL_PATTERN})|(?<dice>[1-9]\\d*)(?<hasD>d(?<sides>[1-9]\\d*)?)?)`,
    '(?:\\s*(?<modifier>[+\\-\\u2013\\u2212]\\d+))?',
    '(?:\\s*(?<margin>\\+?@margin))?',
    `(?:\\s*(?<multiplier>[*x\\u00D7]${DECIMAL_PATTERN}))?`,
    '(?<bang>!)?',
    `(?:\\s*(?<divisor>\\(${DECIMAL_PATTERN}\\)))?`,
    `\\s+(?<type>${IDENTIFIER_PATTERN})`,
    `(?:\\s+(?<extendedType>${IDENTIFIER_PATTERN}))?`,
    '(?:\\s*(?<costTail>(?:\\/|\\*per|\\*costs|\\*cost(?!s))\\s*[^@\\s]+(?:\\s*[^@\\s]+)?))?',
    '(?:\\s*(?<hitLocation>@[^\\s]+))?',
    '\\s*$',
  ].join(''),
  'i'
)

function normalizeMinus(value: string): string {
  return value.replace(/[\u2013\u2212]/g, '-')
}

function parseCostFlag(raw: string): DamageCostFlag {
  const flag = raw.toLowerCase()
  if (flag === '*costs') return '*costs'
  if (flag === '*cost') return '*costs'
  if (flag === '*per') return '*per'
  return '*per'
}

function parseCostPhrase(raw: string): DamageCostPhrase | null {
  const slashMatch = raw.match(/^(?<flag>\/|\*per|\*costs|\*cost(?!s))\s*(?<amount>[1-9]\d*)?\s*(?<pool>\S+)$/i)
  if (slashMatch?.groups?.pool) {
    return {
      flag: parseCostFlag(slashMatch.groups.flag),
      amount: slashMatch.groups.amount ? Number.parseInt(slashMatch.groups.amount, 10) : 1,
      pool: slashMatch.groups.pool,
    }
  }

  return null
}

function parseDamageType(raw: string): string {
  return raw.toLowerCase()
}

function parseDerivedRoll(raw: string): NonNullable<DamageTerm['derivedRoll']> {
  const normalized = raw.toLowerCase()
  if (normalized === 'sw' || normalized === 'swing') return 'sw'
  return 'thr'
}

export class DamageTermParser {
  static parse(input: string): DamageTerm | null {
    return new DamageTermParser(input).parse()
  }

  static isValid(input: string): boolean {
    return new DamageTermParser(input).isValid()
  }

  constructor(input: string) {
    this.input = input
    this.parse()
  }

  private input: string

  output: DamageTerm | null = null

  parse(): DamageTerm | null {
    if (this.output) return this.output

    const addMargin = /\+@margin\b/i.test(this.input)
    const normalizedInput = this.input.replace(/\s*\+@margin\b/gi, ' ')
    const match = normalizedInput.match(DAMAGE_TERM_REGEX)
    if (!match?.groups) return null

    const hasDerivedRoll = !!match.groups.derivedRoll
    const hasDirectRoll = !!match.groups.hasD
    const hasScalarRoll = !hasDerivedRoll && !hasDirectRoll

    // Scalar damage form allows optional multiplier and optional divisor, but not modifier or bang.
    if (hasScalarRoll && (match.groups.modifier || match.groups.bang)) {
      return null
    }

    // Per grammar, leading '+' is allowed only for damage-roll terms.
    if (match.groups.accumulator && hasScalarRoll) {
      return null
    }

    const cost = match.groups.costTail ? parseCostPhrase(match.groups.costTail) : null
    if (match.groups.costTail && !cost) return null

    const dice = match.groups.dice ? Number.parseInt(match.groups.dice, 10) : null
    const parsedSides = match.groups.sides ? Number.parseInt(match.groups.sides, 10) : null
    const sides = parsedSides === null || parsedSides === 6 ? null : parsedSides
    const derivedRoll = match.groups.derivedRoll ? parseDerivedRoll(match.groups.derivedRoll) : null

    const modifier = match.groups.modifier ? Number.parseInt(normalizeMinus(match.groups.modifier), 10) : 0

    const multiplier = match.groups.multiplier ? Number.parseFloat(match.groups.multiplier.slice(1)) : 1

    const divisor = match.groups.divisor ? Number.parseFloat(match.groups.divisor.slice(1, -1)) : 1

    const extendedType = match.groups.extendedType ? match.groups.extendedType.toLowerCase() : null
    const hitLocation = match.groups.hitLocation ? match.groups.hitLocation.slice(1) : null

    this.output = {
      original: this.input,
      accumulator: !!match.groups.accumulator,
      dice,
      derivedRoll,
      usesDice: !!match.groups.hasD,
      bang: !!match.groups.bang,
      sides,
      modifier,
      multiplier,
      divisor,
      type: parseDamageType(match.groups.type),
      extendedType,
      cost,
      addMargin,
      hitLocation,
    }

    return this.output
  }

  isValid(): boolean {
    return this.output !== null
  }

  toCanonicalString(): string | null {
    if (!this.output) return null

    const parts = [
      `${this.output.accumulator ? '+' : ''}${this.rollString}${this.divisorString}`,
      this.output.type,
      this.output.extendedType,
      this.output.cost !== null ? `${this.output.cost.flag} ${this.output.cost.amount} ${this.output.cost.pool}` : null,
      this.output.hitLocation !== null ? `@${this.output.hitLocation}` : null,
    ].filter(Boolean)

    return parts.join(' ')
  }

  get damageRollString(): string {
    if (!this.output) return ''

    const type = this.output.type ? ' ' + this.output.type : ''
    const extendedType = this.output.extendedType ? ' ' + this.output.extendedType : ''
    return `${this.formulaString}${type}${extendedType}`
  }

  /**
   * Returns the die roll portion of the damage formula -- i.e., the die roll, modifier, multiplier, and bang if present.
   * Handles standard dice notation, flat damage, and derived rolls.
   * E.g., "2d+1×2" or "sw+1×2" or "2+1×2"
   */
  get rollString(): string {
    if (!this.output) return ''

    const d = this.output.usesDice ? 'd' : ''
    const sides = this.output.sides !== null ? this.output.sides : ''
    const roll = this.output.dice !== null ? `${this.output.dice}` : (this.output.derivedRoll ?? '')

    return `${roll}${d}${sides}${this.modifierString}${this.multiplierString}${this.output.bang ? '!' : ''}`
  }

  /**
   * Returns the modifier portion of the damage formula, including +@margin if present.
   * If the modifier is zero and there is no +@margin, it returns an empty string.
   * E.g., "+1" or "-1+@margin".
   */
  get modifierString() {
    if (!this.output) return ''
    if (this.output.modifier === 0 && this.output.addMargin === false) return ''

    let result =
      this.output.modifier > 0 ? `+${this.output.modifier}` : this.output.modifier < 0 ? `${this.output.modifier}` : ''

    if (this.output.addMargin) result += '+@margin'

    return result
  }

  /**
   * Returns the multiplier portion of the damage formula, e.g., "×2".
   * If the multiplier is 1 or not present, it returns an empty string.
   */
  get multiplierString(): string {
    if (!this.output || this.output.multiplier === 1) return ''
    return this.output.multiplier !== null ? `×${this.output.multiplier}` : ''
  }

  /**
   * Returns the armor divisor portion of the damage formula, e.g., "(0.5)" or "(2)".
   * If the divisor is 1 or not present, it returns an empty string.
   */
  get divisorString(): string {
    if (!this.output || this.output.divisor === null || this.output.divisor === 1) return ''
    return `(${this.output.divisor})`
  }

  /**
   * Returns the cost portion of the damage formula, e.g., "*costs 2 FP".
   * If there is no cost, it returns null.
   */
  get cost(): string | null {
    if (!this.output || !this.output.cost) return null
    return `${this.output.cost.flag} ${this.output.cost.amount} ${this.output.cost.pool}`
  }

  /**
   * Returns the canonical formula string for the damage dice formula, e.g., "2d+1×2(0.5)"
   */
  get formulaString(): string {
    if (!this.output) return ''

    return `${this.rollString}${this.divisorString}`
  }
}
