import { HitLocationEntryV2 } from '../data/hit-location-entry.js'
import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel
import { convertRangeTextToArray } from 'module/utilities/text-utilties.js'

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
