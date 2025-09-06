import { defineGetterProperties } from '../../utilities/object-utils.js'
import { MeleeAttackModel } from '../index.js'

const getterKeys = [
  'addToQuickRoll',
  'baseParryPenalty',
  'block',
  'consumeAction',
  'contains',
  'cost',
  'damage',
  'extraAttacks',
  'import',
  'itemModifiers',
  'level',
  'mode',
  'modifierTags',
  'name',
  'notes',
  'originalName',
  'pageref',
  'parentuuid',
  'parry',
  'parryBonus',
  'reach',
  'st',
  'techlevel',
  'uuid',
  'weight',
] as const

class MeleeV1 {
  meleeV2: MeleeAttackModel

  constructor(meleeV2: MeleeAttackModel) {
    this.meleeV2 = meleeV2

    // Make selected prototype getters enumerable own properties so Object.values() includes them.
    defineGetterProperties(this, [...getterKeys])
  }

  get addToQuickRoll() {
    return this.meleeV2.mel.addToQuickRoll
  }

  get baseParryPenalty() {
    return this.meleeV2.mel.baseParryPenalty
  }

  get block() {
    return this.meleeV2.mel.block
  }

  get consumeAction() {
    return this.meleeV2.mel.consumeAction
  }

  get contains() {
    return this.meleeV2.mel.contains
  }

  get cost() {
    return this.meleeV2.mel.cost
  }

  get damage() {
    return this.meleeV2.mel.damage
  }

  get extraAttacks() {
    return this.meleeV2.mel.extraAttacks
  }

  get import() {
    return this.meleeV2.mel.import
  }

  get itemModifiers() {
    return this.meleeV2.mel.itemModifiers
  }

  get level() {
    return this.meleeV2.mel.level
  }

  get mode() {
    return this.meleeV2.mel.mode
  }

  get modifierTags() {
    return this.meleeV2.mel.modifierTags
  }

  get name() {
    return this.meleeV2.name
  }

  get notes() {
    return this.meleeV2.mel.notes
  }

  get originalName() {
    return this.meleeV2.name
  }

  get pageref() {
    return this.meleeV2.mel.pageref
  }

  get parentuuid() {
    return ''
  }

  get parry() {
    return this.meleeV2.mel.parry
  }

  get parryBonus() {
    return this.meleeV2.mel.parrybonus
  }

  get reach() {
    return this.meleeV2.mel.reach
  }

  get st() {
    return this.meleeV2.mel.st
  }

  get techlevel() {
    return this.meleeV2.mel.techlevel
  }

  get uuid() {
    return this.meleeV2.uuid
  }

  get weight() {
    return this.meleeV2.mel.weight
  }
}
export { MeleeV1 }
