import { DeepPartial } from 'fvtt-types/utils'

export const OtfActionType = {
  attack: 'attack',
  attackDamage: 'attackdamage',
  attribute: 'attribute',
  chat: 'chat',
  controlRoll: 'controlroll',
  damage: 'damage',
  derivedDamage: 'deriveddamage',
  derivedRoll: 'derivedroll',
  dragDrop: 'dragdrop',
  href: 'href',
  ifTest: 'iftest',
  modifier: 'modifier',
  pdf: 'pdf',
  roll: 'roll',
  skillSpell: 'skill-spell',
  testExists: 'test-exists',
  weaponBlock: 'weapon-block',
  weaponParry: 'weapon-parry',
} as const

export type OtfActionType = (typeof OtfActionType)[keyof typeof OtfActionType]

/**
 * In the current state of the code, pretty much every attribute of this object is optional.
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
  next?: OtfAction
  orig: string
  overridetxt: string
  quiet: boolean
  spantext: string
  suppressWarnings: boolean
  target: string | number
  truetext: string
  type: OtfActionType
}

export type OtfAction = DeepPartial<BaseAction>

export type ParserResult = {
  text: string
  action: OtfAction
}
