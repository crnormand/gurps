import { DataModel, fields } from '@gurps-types/foundry/index.js'
import { convertRangeTextToArray } from '@util/text-utilties.js'

import { HitLocationEntryV2 } from '../data/hit-location-entry.js'

class HitLocationEntryV1 extends DataModel<HitLocationSchemaV1> {
  static createFromV2(entry: HitLocationEntryV2): HitLocationEntryV1 {
    return new HitLocationEntryV1({
      _damageType: entry._damageType,
      dr: entry._dr,
      drCap: entry.drCap,
      drItem: entry.drItem,
      drMod: entry.drMod,
      equipment: '',
      import: entry.import,
      penalty: entry.penalty,
      roll: entry.rollText,
      where: entry.where,
      split: entry.split,
      role: entry.role,
    })
  }

  static updateV2(entryV2: HitLocationEntryV2, newData: any) {
    entryV2._damageType = newData._damageType ?? entryV2._damageType
    entryV2._dr = newData.dr ?? entryV2._dr
    entryV2.drCap = newData.drCap ?? entryV2.drCap
    entryV2.drItem = newData.drItem ?? entryV2.drItem
    entryV2.drMod = newData.drMod ?? entryV2.drMod
    entryV2.import = newData.import ?? entryV2.import
    entryV2.penalty = newData.penalty ?? entryV2.penalty
    entryV2.rollText = newData.roll ?? entryV2.rollText
    entryV2.where = newData.where ?? entryV2.where
    entryV2.split = newData.split ?? entryV2.split
    entryV2.role = newData.role ?? entryV2.role
  }

  static override defineSchema(): HitLocationSchemaV1 {
    return hitLocationSchemaV1()
  }

  // NOTE: Made it a lazily evaluated value.
  get rollArray(): number[] {
    return convertRangeTextToArray(this.roll)
  }
}

const hitLocationSchemaV1 = () => {
  return {
    _damageType: new fields.StringField({ required: true, nullable: true, initial: null }),
    dr: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    // drCap represents the capped DR, applied by the /dr command
    drCap: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    // drItem represent the DR bonus from Item bonuses
    drItem: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    // drMod represent the DR bonus from the /dr command
    drMod: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    equipment: new fields.StringField({ required: true, nullable: false, initial: '' }),
    import: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    penalty: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    roll: new fields.StringField({ required: true, nullable: false, initial: '' }),
    where: new fields.StringField({ required: true, nullable: false }),
    split: new fields.TypedObjectField(new fields.NumberField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    role: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }
}

type HitLocationSchemaV1 = ReturnType<typeof hitLocationSchemaV1>

export { HitLocationEntryV1, type HitLocationSchemaV1 }
