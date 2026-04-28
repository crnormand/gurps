import { DeepPartial } from 'fvtt-types/utils'

export const OtfActionType = {
  attack: 'attack',
  attackdamage: 'attackdamage',
  attribute: 'attribute',
  chat: 'chat',
  controlroll: 'controlroll',
  damage: 'damage',
  deriveddamage: 'deriveddamage',
  derivedroll: 'derivedroll',
  dragdrop: 'dragdrop',
  href: 'href',
  iftest: 'iftest',
  modifier: 'modifier',
  pdf: 'pdf',
  roll: 'roll',
  skillSpell: 'skill-spell',
  testexists: 'test-exists',
  weaponBlock: 'weapon-block',
  weaponParry: 'weapon-parry',
} as const

export type OtfActionType = (typeof OtfActionType)[keyof typeof OtfActionType]

/**
 * In the current state of the code, pretty much every attribure of this object is optional.
 */
type BaseAction = {
  attribute: string
  blindroll: boolean
  clrdmods: boolean
  costs: string
  desc: string
  falsetext: string
  floatingAttribute: string
  floatingLabel: string
  floatingType: string
  isSkillOnly: boolean
  isSpellOnly: boolean
  label: string
  link: string
  mod: string
  name: string
  next?: Action
  orig: string
  overridetxt: string
  quiet: boolean
  spantext: string
  truetext: string
  type: OtfActionType
}

export type Action = DeepPartial<BaseAction>

export type ParserResult = {
  text: string
  action: Action
}
