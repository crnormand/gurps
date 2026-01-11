import { DataModel, fields } from '../../types/foundry/index.js'
import { convertRangeTextToArray } from '../../utilities/text-utilties.js'

class HitLocationEntryV2 extends DataModel<HitLocationSchemaV2> {
  static override defineSchema(): HitLocationSchemaV2 {
    return hitLocationSchema()
  }

  // NOTE: Made it a lazily evaluated value.
  get roll(): number[] {
    return convertRangeTextToArray(this.rollText)
  }

  /* ---------------------------------------- */

  static getlargeAreaDR(locations: HitLocationEntryV2[]): number {
    let lowestDR = Number.POSITIVE_INFINITY
    let torsoDR = 0

    for (const location of locations.filter(loc => loc.roll.length > 0)) {
      if (location.where.toLowerCase() === 'torso') torsoDR = location.dr
      if (location.dr < lowestDR) lowestDR = location.dr
    }

    // return the average of torso and lowest DR
    return Math.ceil((torsoDR + lowestDR) / 2)
  }

  /* ---------------------------------------- */
  /*  Accessors                               */
  /* ---------------------------------------- */

  getDR(damageType: string | null = null): number {
    if (damageType === null || !this.split) return this._dr

    return Object.hasOwn(this.split, damageType) ? (this.split as Record<string, number>)[damageType] : this._dr
  }

  get dr(): number {
    return this.getDR(this._damageType)
  }
}

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

    // The role of the hitlocation for the purposes of applying damage: arms and legs are "limbs"; hands and feet,
    // "extremities", etc.
    role: new fields.StringField({ required: false, nullable: false, initial: '' }),
  }
}

type HitLocationSchemaV2 = ReturnType<typeof hitLocationSchema>

/* ---------------------------------------- */

export { HitLocationEntryV2, type HitLocationSchemaV2 }
