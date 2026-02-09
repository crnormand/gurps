import { Melee } from '@module/actor/actor-components.js'
import { defineGetterProperties } from '@module/util/object-utils.js'

import { MeleeAttackModel } from '../index.js'

class MeleeV1 {
  meleeV2: MeleeAttackModel

  constructor(meleeV2: MeleeAttackModel) {
    this.meleeV2 = meleeV2

    const meleeKeys = Object.keys(new Melee())

    // Make selected prototype getters enumerable own properties so Object.values() includes them.
    defineGetterProperties(this, [...meleeKeys, 'name', 'parryBonus', 'itemModifier', 'addToQuickRoll'])
  }

  get addToQuickRoll() {
    return this.meleeV2.addToQuickRoll
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
    // return this.meleeV2.contains
    return []
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
    return this.meleeV2.mel.name
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
