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

export type DamageType = string

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
  usesD: boolean
  sides: null
  derivedRoll: 'sw' | 'thr' | null
  bang: boolean
  modifier: number
  multiplier: number | null
  divisor: number | null
  type: DamageType
  extendedType: string | null
  cost: DamageCostPhrase | null
  hitLocation: string | null
}

const DECIMAL_PATTERN = '(?:0\\.\\d+|[1-9]\\d*(?:\\.\\d*)?)'
const IDENTIFIER_PATTERN = '[A-Za-z][A-Za-z0-9_+\\-.]*'
const DERIVED_ROLL_PATTERN = '(?:sw|swing|thr|thrust|trust)'
const DAMAGE_TERM_REGEX = new RegExp(
  [
    '^\\s*',
    '(?<accumulator>\\+)?',
    `(?:(?<derivedRoll>${DERIVED_ROLL_PATTERN})|(?<dice>[1-9]\\d*)(?<hasD>d)?)`,
    '(?<modifier>[+\\-\\u2013\\u2212]\\d+)?',
    `(?<multiplier>[*x\\u00D7]${DECIMAL_PATTERN})?`,
    '(?<bang>!)?',
    `(?:\\s*(?<divisor>\\(${DECIMAL_PATTERN}\\)))?`,
    `\\s+(?<type>${IDENTIFIER_PATTERN})`,
    `(?:\\s+(?<extendedType>${IDENTIFIER_PATTERN}))?`,
    '(?:\\s+(?<costTail>(?:\\/|\\*per|\\*costs|\\*cost)\\s+[^@\\s]+(?:\\s*[^@\\s]+)?))?',
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
  const slashMatch = raw.match(/^(?<flag>\/|\*per|\*costs|\*cost)\s+(?<amount>[1-9]\d*)?\s*(?<pool>\S+)$/)
  if (slashMatch?.groups?.pool) {
    return {
      flag: parseCostFlag(slashMatch.groups.flag),
      amount: slashMatch.groups.amount ? Number.parseInt(slashMatch.groups.amount, 10) : 1,
      pool: slashMatch.groups.pool,
    }
  }

  return null
}

function parseDamageType(raw: string): DamageType {
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

    const match = this.input.match(DAMAGE_TERM_REGEX)
    if (!match?.groups) return null

    const hasDerivedRoll = !!match.groups.derivedRoll
    const hasDirectRoll = !!match.groups.hasD
    const hasScalarRoll = !hasDerivedRoll && !hasDirectRoll

    // Scalar damage form allows only a bare number before type.
    if (
      hasScalarRoll &&
      (match.groups.modifier || match.groups.multiplier || match.groups.bang || match.groups.divisor)
    ) {
      return null
    }

    // Per grammar, leading '+' is allowed only for damage-roll terms.
    if (match.groups.accumulator && hasScalarRoll) {
      return null
    }

    const cost = match.groups.costTail ? parseCostPhrase(match.groups.costTail) : null
    if (match.groups.costTail && !cost) return null

    const dice = match.groups.dice ? Number.parseInt(match.groups.dice, 10) : null
    const sides = null
    const derivedRoll = match.groups.derivedRoll ? parseDerivedRoll(match.groups.derivedRoll) : null

    const modifier = match.groups.modifier ? Number.parseInt(normalizeMinus(match.groups.modifier), 10) : 0

    const multiplier = match.groups.multiplier ? Number.parseFloat(match.groups.multiplier.slice(1)) : null

    const divisor = match.groups.divisor ? Number.parseFloat(match.groups.divisor.slice(1, -1)) : null

    const extendedType = match.groups.extendedType ? match.groups.extendedType.toLowerCase() : null
    const hitLocation = match.groups.hitLocation ? match.groups.hitLocation.slice(1) : null

    this.output = {
      original: this.input,
      accumulator: !!match.groups.accumulator,
      dice,
      derivedRoll,
      usesD: !!match.groups.hasD,
      bang: !!match.groups.bang,
      sides,
      modifier,
      multiplier,
      divisor,
      type: parseDamageType(match.groups.type),
      extendedType,
      cost,
      hitLocation,
    }

    return this.output
  }

  isValid(): boolean {
    return this.output !== null
  }

  toCanonicalString(): string | null {
    if (!this.output) return null

    const rollPart = this.output.derivedRoll
      ? this.output.derivedRoll
      : this.output.usesD
        ? `${this.output.dice}d${this.output.sides === 6 || this.output.sides === null ? '' : this.output.sides}`
        : `${this.output.dice}`
    const modifierPart =
      this.output.modifier !== 0
        ? this.output.modifier >= 0
          ? `+${this.output.modifier}`
          : `${this.output.modifier}`
        : ''
    const multiplierPart = this.output.multiplier !== null ? `×${this.output.multiplier}` : ''
    const bangPart = this.output.bang ? '!' : ''
    const divisorPart = this.output.divisor !== null ? `(${this.output.divisor})` : ''

    const parts = [
      `${this.output.accumulator ? '+' : ''}${rollPart}${modifierPart}${multiplierPart}${bangPart}${divisorPart}`,
      this.output.type,
      this.output.extendedType,
      this.output.cost !== null ? `${this.output.cost.flag} ${this.output.cost.amount} ${this.output.cost.pool}` : null,
      this.output.hitLocation !== null ? `@${this.output.hitLocation}` : null,
    ].filter(Boolean)

    return parts.join(' ')
  }
}
