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

export type DamageType = (typeof DAMAGE_TYPES)[number]

export const DAMAGE_COST_FLAGS = ['/', '*per', '*cost', '*costs'] as const

export type DamageCostFlag = (typeof DAMAGE_COST_FLAGS)[number]

export type DamageCostPhrase = {
  flag: DamageCostFlag
  amount: number | null
  pool: string
}

export type DamageTerm = {
  original: string
  dice: number
  sides: number | null
  modifier: number | null
  multiplier: number | null
  divisor: number | null
  type: DamageType
  extendedType: 'ex' | null
  cost: DamageCostPhrase | null
}

const DECIMAL_PATTERN = '(?:0|[1-9]\\d*(?:\\.\\d*)?)'
const TYPE_PATTERN = '(?:pi\\+\\+|pi\\+|pi\\-|aff|burn|cor|cr|cut|fat|imp|kb|pi|spec\\.|tox)'
const DAMAGE_TERM_REGEX = new RegExp(
  [
    '^\\s*',
    '(?<dice>[1-9]\\d*)d(?<sides>\\d*)',
    '(?<modifier>[+\\-\\u2013\\u2212]\\d+)?',
    '(?<multiplier>[*x\\u00D7]\\d+(?:\\.\\d+)?)?',
    `(?:\\s*(?<divisor>\\(${DECIMAL_PATTERN}\\)))?`,
    `\\s+(?<type>${TYPE_PATTERN})`,
    '(?:\\s+(?<extendedType>ex))?',
    '(?:\\s+(?<costTail>.*\\S))?',
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
  if (flag === '*cost') return '*cost'
  if (flag === '*per') return '*per'
  return '/'
}

function parseCostPhrase(raw: string): DamageCostPhrase | null {
  const slashMatch = raw.match(/^\/\s+(?<amount>[1-9]\d*)?\s*(?<pool>\S+)$/)
  if (slashMatch?.groups?.pool) {
    return {
      flag: '/',
      amount: slashMatch.groups.amount ? Number.parseInt(slashMatch.groups.amount, 10) : null,
      pool: slashMatch.groups.pool,
    }
  }

  const starSpaced = raw.match(/^(?<flag>\*per|\*costs|\*cost)\s+(?<amount>[1-9]\d*)?\s*(?<pool>\S+)$/i)
  if (starSpaced?.groups?.flag && starSpaced.groups.pool) {
    return {
      flag: parseCostFlag(starSpaced.groups.flag),
      amount: starSpaced.groups.amount ? Number.parseInt(starSpaced.groups.amount, 10) : null,
      pool: starSpaced.groups.pool,
    }
  }

  return null
}

function parseDamageType(raw: string): DamageType {
  const normalized = raw.toLowerCase()
  if (normalized === 'pi++') return 'pi++'
  if (normalized === 'pi+') return 'pi+'
  if (normalized === 'pi-') return 'pi-'
  if (normalized === 'pi') return 'pi'
  if (normalized === 'spec.') return 'spec.'
  return normalized as Exclude<DamageType, 'pi++' | 'pi+' | 'pi-' | 'pi' | 'spec.'>
}

export function parseDamageTerm(input: string): DamageTerm | null {
  const match = input.match(DAMAGE_TERM_REGEX)
  if (!match?.groups) return null

  const cost = match.groups.costTail ? parseCostPhrase(match.groups.costTail) : null
  if (match.groups.costTail && !cost) return null

  const dice = Number.parseInt(match.groups.dice, 10)
  const sides = match.groups.sides ? Number.parseInt(match.groups.sides, 10) : null

  const modifier = match.groups.modifier ? Number.parseInt(normalizeMinus(match.groups.modifier), 10) : null

  const multiplier = match.groups.multiplier ? Number.parseFloat(match.groups.multiplier.slice(1)) : null

  const divisor = match.groups.divisor ? Number.parseFloat(match.groups.divisor.slice(1, -1)) : null

  const extendedType = match.groups.extendedType ? 'ex' : null

  return {
    original: input,
    dice,
    sides,
    modifier,
    multiplier,
    divisor,
    type: parseDamageType(match.groups.type),
    extendedType,
    cost,
  }
}

export function isValidDamageTerm(input: string): boolean {
  return parseDamageTerm(input) !== null
}
