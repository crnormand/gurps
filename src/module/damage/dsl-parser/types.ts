export type DamageTokenType =
  | 'whitespace'
  | 'margin'
  | 'plus'
  | 'minus'
  | 'integer'
  | 'decimal'
  | 'd'
  | 'lparen'
  | 'rparen'
  | 'times'
  | 'bang'
  | 'costFlag'
  | 'hitLocation'
  | 'identifier'
  | 'pool'
  | 'eof'

export interface DamageToken {
  type: DamageTokenType
  lexeme: string
  position: number
}

export type DamageValueNode = DirectRollNode | DerivedRollNode | ScalarRollNode

export interface DirectRollNode {
  kind: 'direct'
  dice: number
  sides: number | null
}

export interface DerivedRollNode {
  kind: 'derived'
  basis: 'sw' | 'thr'
}

export interface ScalarRollNode {
  kind: 'scalar'
  value: number
}

export interface CostPhraseNode {
  flag: '/' | '*per' | '*cost' | '*costs'
  amount?: number
  pool: string
}

export interface DamageRollNode {
  accumulate: boolean
  value: DamageValueNode
  modifier?: number
  multiplier?: number
  minimum: boolean
  divisor?: number
}

export interface DamageTermNode {
  roll: DamageRollNode
  type: string
  extendedType?: string
  cost?: CostPhraseNode
  hitLocation?: string
  addMargin: boolean
  canonicalModifier: string
}
