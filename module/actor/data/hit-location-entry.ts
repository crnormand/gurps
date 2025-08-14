import { convertRangeTextToArray } from '../../utilities/text-utilties.js'
import DataModel = foundry.abstract.DataModel
import fields = foundry.data.fields

class HitLocationEntryV2 extends DataModel<HitLocationSchemaV2> {
  static override defineSchema(): HitLocationSchemaV2 {
    return hitLocationSchema()
  }

  // NOTE: Made it a lazily evaluated value.
  get roll(): number[] {
    return convertRangeTextToArray(this.rollText)
  }
}

/* ---------------------------------------- */

const hitLocationSchema = () => {
  return {
    where: new fields.StringField({ required: true, nullable: false }),
    import: new fields.NumberField({ required: true, nullable: false }),
    penalty: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    _dr: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    _damageType: new fields.StringField({ required: true, nullable: true, initial: null }),

    rollText: new fields.StringField({ required: true, nullable: false, initial: '' }),

    // roll: new fields.ArrayField(new fields.NumberField({ required: true, nullable: false }), {
    //   required: true,
    //   nullable: false,
    //   initial: [],
    // }),

    split: new fields.TypedObjectField(new fields.NumberField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),

    // drMod represent the DR bonus from the /dr command
    drMod: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    // drItem represent the DR bonus from Item bonuses
    drItem: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    // drCap represents the capped DR, applied by the /dr command
    drCap: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
  }
}
type HitLocationSchemaV2 = ReturnType<typeof hitLocationSchema>

/* ---------------------------------------- */

class HitLocationEntryV1 extends DataModel<HitLocationSchemaV1> {
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
    drCap: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    drItem: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
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

    // drMod represent the DR bonus from the /dr command

    // drItem represent the DR bonus from Item bonuses

    // drCap represents the capped DR, applied by the /dr command
  }
}
type HitLocationSchemaV1 = ReturnType<typeof hitLocationSchemaV1>

export { HitLocationEntryV2, HitLocationEntryV1, type HitLocationSchemaV2, type HitLocationSchemaV1 }
