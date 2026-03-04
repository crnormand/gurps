import { defineGetterProperties } from '@util/object-utils.js'

import { Ranged } from '../../actor/actor-components.js'
import { RangedAttackModel } from '../ranged-attack.js'

class RangedV1 {
  rangedV2: RangedAttackModel

  constructor(rangedV2: RangedAttackModel) {
    this.rangedV2 = rangedV2

    const rangedKeys = Object.keys(new Ranged())

    // Make selected prototype getters enumerable own properties so Object.values() includes them.
    defineGetterProperties(this, [...rangedKeys, 'addToQuickRoll', 'itemModifiers', 'name'])
  }

  // Generate getters for each of the ranged attack properties. Delegate to the underlying RangedAttackModel.
  get acc() {
    return this.rangedV2.acc
  }

  get addToQuickRoll() {
    return this.rangedV2.addToQuickRoll
  }

  get ammo() {
    return this.rangedV2.ammo
  }

  get bulk() {
    return this.rangedV2.bulk
  }

  get consumeAction() {
    return this.rangedV2.consumeAction
  }

  get contains() {
    return [] // this.rangedV2.contains
  }

  get damage() {
    return this.rangedV2.damage
  }

  get extraAttacks() {
    return this.rangedV2.extraAttacks
  }

  get halfd() {
    return this.rangedV2.halfd
  }

  get import() {
    return this.rangedV2.import
  }

  get itemModifiers() {
    return this.rangedV2.itemModifiers
  }

  get legalityclass() {
    return this.rangedV2.legalityclass
  }

  get level() {
    return this.rangedV2.level
  }

  get max() {
    return this.rangedV2.max
  }

  get mode() {
    return this.rangedV2.mode
  }

  get modifierTags() {
    return this.rangedV2.modifierTags
  }

  get name() {
    return this.rangedV2.name
  }

  get notes() {
    return this.rangedV2.notes
  }

  get originalName() {
    return this.rangedV2.name
  }

  get pageref() {
    return ''
  }

  get parentuuid() {
    return ''
  }

  get range() {
    return this.rangedV2.range
  }

  get rcl() {
    return this.rangedV2.rcl
  }

  get rof() {
    return this.rangedV2.rateOfFire
  }

  get shots() {
    return this.rangedV2.shots
  }

  get st() {
    return this.rangedV2.st
  }

  get uuid() {
    return this.rangedV2.uuid
  }
}

export { RangedV1 }
