import { GcsElement } from './base.js'
import fields = foundry.data.fields
import { AnyObject } from 'fvtt-types/utils'
import { GcsSkillDefault } from './skill-default.js'

class GcsWeapon extends GcsElement<WeaponData> {
  static override defineSchema(): WeaponData {
    return weaponData()
  }

  /* ---------------------------------------- */

  protected static override _importField(data: any, field: fields.DataField.Any, name: string): any {
    if (name === 'defaults') {
      return data?.map((defaultData: AnyObject) =>
        GcsSkillDefault.fromImportData(defaultData as any, GcsSkillDefault.defineSchema())
      )
    }
    return super._importField(data, field, name)
  }
}

/* ---------------------------------------- */

const weaponData = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    damage: new fields.SchemaField(
      {
        base: new fields.StringField({ required: true, nullable: false }),
        type: new fields.StringField({ required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),
    strength: new fields.StringField({ required: true, nullable: true }),
    usage: new fields.StringField({ required: true, nullable: true }),
    usage_notes: new fields.StringField({ required: true, nullable: true }),
    reach: new fields.StringField({ required: true, nullable: true }),
    parry: new fields.StringField({ required: true, nullable: true }),
    block: new fields.StringField({ required: true, nullable: true }),
    accuracy: new fields.StringField({ required: true, nullable: true }),
    range: new fields.StringField({ required: true, nullable: true }),
    rate_of_fire: new fields.StringField({ required: true, nullable: true }),
    shots: new fields.StringField({ required: true, nullable: true }),
    bulk: new fields.StringField({ required: true, nullable: true }),
    recoil: new fields.StringField({ required: true, nullable: true }),
    defaults: new fields.ArrayField(new fields.EmbeddedDataField(GcsSkillDefault, { required: true, nullable: false })),
    hide: new fields.BooleanField({ required: true, nullable: true }),
    calc: new fields.SchemaField(
      {
        level: new fields.NumberField({ required: true, nullable: false }),
        damage: new fields.StringField({ required: true, nullable: true }),
        parry: new fields.StringField({ required: true, nullable: true }),
        block: new fields.StringField({ required: true, nullable: true }),
        accuracy: new fields.StringField({ required: true, nullable: true }),
        reach: new fields.StringField({ required: true, nullable: true }),
        range: new fields.StringField({ required: true, nullable: true }),
        rate_of_fire: new fields.StringField({ required: true, nullable: true }),
        shots: new fields.StringField({ required: true, nullable: true }),
        bulk: new fields.StringField({ required: true, nullable: true }),
        recoil: new fields.StringField({ required: true, nullable: true }),
        strength: new fields.StringField({ required: true, nullable: true }),
      },
      { required: true, nullable: true }
    ),
  }
}

type WeaponData = ReturnType<typeof weaponData>

/* ---------------------------------------- */

export { GcsWeapon, weaponData }
