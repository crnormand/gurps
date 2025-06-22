import DataModel = foundry.abstract.DataModel
import fields = foundry.data.fields

class HitLocationEntry extends DataModel<HitLocationSchema> {
  constructor(...args: DataModel.ConstructorArgs<HitLocationSchema>) {
    super(...args)
  }

  /* ---------------------------------------- */

  static override defineSchema(): HitLocationSchema {
    return hitLocationSchema()
  }

  /* ---------------------------------------- */

  static getlargeAreaDR(locations: HitLocationEntry[]): number {
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
    return this.split.hasOwnProperty(damageType) ? (this.split as Record<string, number>)[damageType] : this._dr
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
    roll: new fields.StringField({ required: true, nullable: false, initial: '-' }),
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

type HitLocationSchema = ReturnType<typeof hitLocationSchema>

export { HitLocationEntry, type HitLocationSchema }
