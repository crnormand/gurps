import { Melee } from '@module/actor/actor-components.js'
import { defineGetterProperties } from '@util/object-utils.js'

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
    return this.meleeV2.baseParryPenalty
  }

  get block() {
    return this.meleeV2.block
  }

  get consumeAction() {
    return this.meleeV2.consumeAction
  }

  get contains() {
    // return this.meleeV2.contains
    return []
  }

  // not sure what cost is supposed to do
  // get cost() {
  //   return this.meleeV2.cost
  // }

  get damage() {
    return this.meleeV2.damage
  }

  get extraAttacks() {
    return this.meleeV2.extraAttacks
  }

  get import() {
    return this.meleeV2.import
  }

  get itemModifiers() {
    return this.meleeV2.itemModifiers
  }

  get level() {
    return this.meleeV2.level
  }

  get mode() {
    return this.meleeV2.mode
  }

  get modifierTags() {
    return this.meleeV2.modifierTags
  }

  get name() {
    return this.meleeV2.name
  }

  get notes() {
    return this.meleeV2.notes
  }

  get originalName() {
    return this.meleeV2.name
  }

  get pageref() {
    return ''
  }

  get parentuuid() {
    return ''
  }

  get parry() {
    return this.meleeV2.parryText
  }

  get parryBonus() {
    return this.meleeV2.parry.modifier
  }

  get reach() {
    return this.meleeV2.reachText
  }

  get st() {
    return this.meleeV2.st
  }

  get techlevel() {
    return ''
  }

  get uuid() {
    return this.meleeV2.uuid
  }

  get weight() {
    return ''
  }
}

export { MeleeV1 }
