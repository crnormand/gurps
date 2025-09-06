import { defineGetterProperties } from '../../utilities/object-utils.js'
import { RangedAttackModel } from '../ranged-attack.js'

const getterKeys = [
  'acc',
  'addToQuickRoll',
  'ammo',
  'bulk',
  'consumeAction',
  'contains',
  'damage',
  'extraAttacks',
  'halfd',
  'import',
  'itemModifiers',
  'legalityClass',
  'level',
  'max',
  'mode',
  'modifierTags',
  'name',
  'notes',
  'originalName',
  'pageref',
  'parentuuid',
  'range',
  'rcl',
  'rof',
  'shots',
  'st',
  'uuid',
] as const

class RangedV1 {
  rangedV2: RangedAttackModel

  constructor(rangedV2: RangedAttackModel) {
    this.rangedV2 = rangedV2

    // Make selected prototype getters enumerable own properties so Object.values() includes them.
    defineGetterProperties(this, [...getterKeys])
  }

  // Generate getters for each of the ranged attack properties. Delegate to the underlying RangedAttackModel.
  get acc() {
    return this.rangedV2.rng.acc
  }

  get addToQuickRoll() {
    return this.rangedV2.rng.addToQuickRoll
  }

  get ammo() {
    return this.rangedV2.rng.ammo
  }

  get bulk() {
    return this.rangedV2.rng.bulk
  }

  get consumeAction() {
    return this.rangedV2.rng.consumeAction
  }

  get contains() {
    return this.rangedV2.rng.contains
  }

  get damage() {
    return this.rangedV2.rng.damage
  }

  get extraAttacks() {
    return this.rangedV2.rng.extraAttacks
  }

  get halfd() {
    return this.rangedV2.rng.halfd
  }

  get import() {
    return this.rangedV2.rng.import
  }

  get itemModifiers() {
    return this.rangedV2.rng.itemModifiers
  }

  get legalityClass() {
    return this.rangedV2.rng.legalityclass
  }

  get level() {
    return this.rangedV2.rng.level
  }

  get max() {
    return this.rangedV2.rng.max
  }

  get mode() {
    return this.rangedV2.rng.mode
  }

  get modifierTags() {
    return this.rangedV2.rng.modifierTags
  }

  get name() {
    return this.rangedV2.rng.name
  }

  get notes() {
    return this.rangedV2.rng.notes
  }

  get originalName() {
    return this.rangedV2.rng.name
  }

  get pageref() {
    return this.rangedV2.rng.pageref
  }

  get parentuuid() {
    return ''
  }

  get range() {
    return this.rangedV2.rng.range
  }

  get rcl() {
    return this.rangedV2.rng.rcl
  }

  get rof() {
    return this.rangedV2.rng.rate_of_fire
  }

  get shots() {
    return this.rangedV2.rng.shots
  }

  get st() {
    return this.rangedV2.rng.st
  }

  get uuid() {
    return this.rangedV2.uuid
  }
}
export { RangedV1 }
