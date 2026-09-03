import { MeleeAttackModel, RangedAttackModel } from '@module/action/index.js'

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

type BaseAction = {
  orig: string
  overridetxt?: string
  spantext?: string
  calcOnly?: boolean
  suppressWarnings?: boolean
}

type HttpLinkAction = {
  type: typeof OtfActionType.href
  label: string
} & BaseAction

type PdfAction = {
  type: typeof OtfActionType.pdf
  link: string
} & BaseAction

type IfTestAction = {
  type: typeof OtfActionType.ifTest
  name?: string
  equation?: string
} & BaseAction

export type ModAction = {
  type: typeof OtfActionType.modifier
  mod?: string
  desc: string
  next?: OtfAction
} & BaseAction

type ChatAction = {
  type: typeof OtfActionType.chat
  quiet: boolean
} & BaseAction

type DragDropAction = {
  type: typeof OtfActionType.dragDrop
  link: string
  id: string
} & BaseAction

type ControlRollAction = {
  type: typeof OtfActionType.controlRoll
  target: number
  desc: string
  blindroll: boolean
  sourceId?: string
} & BaseAction

type CheckExistsAction = {
  type: typeof OtfActionType.testExists
  prefix: string
  name: string
} & BaseAction

type AtributteRollAction = {
  type: typeof OtfActionType.attribute
  attribute: string
  attrkey: string
  name: string
  path: string
  desc?: string
  mod?: string
  blindroll: boolean
  next?: OtfAction
  truetext?: string
  falsetext?: string
  target?: string
  melee?: string
  sourceId?: string
  costs?: string //todo: The parser currently don't support costs for attribute rolls, but the actionFunc supports it. Add support for costs in the parser.
} & BaseAction

export type SkillSpellRollAction = {
  type: typeof OtfActionType.skillSpell
  blindroll: boolean
  costs?: string
  desc?: string
  floatingAttribute?: string
  floatingLabel?: string
  floatingType?: string
  isSkillOnly: boolean
  isSpellOnly: boolean
  mod?: string
  name: string
  next?: OtfAction
  sourceId?: string
  target?: number
  truetext?: string
  falsetext?: string
} & BaseAction

type AttackBaseAction = {
  name: string
  mod?: string
  desc?: string
  blindroll: boolean
  costs?: string
  isMelee: boolean
  isRanged: boolean
  sourceId?: string
} & BaseAction

type AttackAction = {
  type: typeof OtfActionType.attack
} & AttackBaseAction

type AttackDamageAction = {
  type: typeof OtfActionType.attackDamage
} & AttackBaseAction

type ParryAction = {
  type: typeof OtfActionType.weaponParry
} & AttackBaseAction

type BlockAction = {
  type: typeof OtfActionType.weaponBlock
} & AttackBaseAction

type RollBaseAction = {
  displayformula: string
  formula: string
  desc?: string
  costs?: string
  hitlocation?: string
  accumulate: boolean
  next?: OtfAction
  blindroll?: boolean
} & BaseAction

type RollAction = {
  type: typeof OtfActionType.roll
  displayformula: string
} & RollBaseAction

export type DamageAction = {
  type: typeof OtfActionType.damage
  damagetype: string
  extdamagetype?: string
  mod?: string
  desc?: string
  att: MeleeAttackModel | RangedAttackModel
} & RollBaseAction

type DerivedRollAction = {
  type: typeof OtfActionType.derivedRoll
  derivedformula: string
} & RollBaseAction

type DerivedDamageAction = {
  type: typeof OtfActionType.derivedDamage
  derivedformula: string
  damagetype: string
  extdamagetype?: string
  mod?: string
  desc?: string
  att: MeleeAttackModel | RangedAttackModel
} & RollBaseAction

export type OtfAction =
  | HttpLinkAction
  | PdfAction
  | IfTestAction
  | ModAction
  | ChatAction
  | DragDropAction
  | ControlRollAction
  | CheckExistsAction
  | AtributteRollAction
  | SkillSpellRollAction
  | AttackAction
  | AttackDamageAction
  | ParryAction
  | BlockAction
  | RollAction
  | DamageAction
  | DerivedRollAction
  | DerivedDamageAction

export type OtfRollAction =
  | ControlRollAction
  | AtributteRollAction
  | SkillSpellRollAction
  | AttackAction
  | ParryAction
  | BlockAction
  | RollAction
  | DerivedRollAction

export type OtfDamageAction = AttackDamageAction | DamageAction | DerivedDamageAction

export type ParserResult = {
  text: string
  action: OtfAction
}
