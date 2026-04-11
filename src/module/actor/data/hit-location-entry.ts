import { fields } from '@gurps-types/foundry/index.js'
import { PseudoDocument, pseudoDocumentSchema } from '@module/pseudo-document/pseudo-document.js'
import { HitLocationRole } from '@rules/hit-locations/types.js'
import { convertRangeTextToArray } from '@util/text-utilties.js'

class HitLocationEntryV2 extends PseudoDocument<HitLocationSchemaV2> {
  static override defineSchema(): HitLocationSchemaV2 {
    return hitLocationSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'HitLocation'> {
    return foundry.utils.mergeObject(super.metadata, {
      documentName: 'HitLocation',
      label: 'DOCUMENT.HitLocation',
    })
  }

  /* ---------------------------------------- */

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
    ...pseudoDocumentSchema(),

    // The name of the hit location
    where: new fields.StringField({ required: true, nullable: false }),

    // The imported DR value for this hit location.
    import: new fields.NumberField({ required: true, nullable: false }),

    // The "to hit" penalty for this hit location
    penalty: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    // The current total DR of this hit location.
    _dr: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    // If this field is specified, the DR value of this hit location is only effective against the specified damage
    // type.
    _damageType: new fields.StringField({ required: true, nullable: true, initial: null }),

    // The displayed text for the hit location's roll range, e.g. "3-4" or "5".
    rollText: new fields.StringField({ required: true, nullable: false, initial: '' }),

    // The split DR values for this hit location, keyed by damage type. If a damage type is not present in this object,
    // the _dr value is used instead.
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
    role: new fields.StringField({
      required: false,
      nullable: true,
      blank: false,
      choices: Object.values(HitLocationRole),
    }),
  }
}

type HitLocationSchemaV2 = ReturnType<typeof hitLocationSchema>

/* ---------------------------------------- */

export { HitLocationEntryV2, type HitLocationSchemaV2 }
