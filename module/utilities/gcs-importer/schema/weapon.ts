import { GcsElement } from './base.js'
import fields = foundry.data.fields
import { AnyObject } from 'fvtt-types/utils'
import { GcsSkillDefault } from './skill-default.js'

class GcsWeapon extends GcsElement<WeaponData> {
  static override defineSchema(): WeaponData {
    return weaponData()
  }

  /* ---------------------------------------- */

  protected static override _importField(data: any, field: fields.DataField.Any): any {
    if (field.name === 'defaults') {
      return data?.map((defaultData: AnyObject) => {
        return GcsSkillDefault.fromImportData(defaultData as any, GcsSkillDefault.schema.fields)
      })
    }
    return super._importField(data, field)
  }
}

/* ---------------------------------------- */

const weaponData = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    damage: new fields.ObjectField({ required: true, nullable: false }),
    strength: new fields.ObjectField({ required: true, nullable: true }),
    usage: new fields.StringField({ required: true, nullable: true }),
    usage_notes: new fields.StringField({ required: true, nullable: true }),
    reach: new fields.ObjectField({ required: true, nullable: true }),
    parry: new fields.ObjectField({ required: true, nullable: true }),
    block: new fields.ObjectField({ required: true, nullable: true }),
    accuracy: new fields.ObjectField({ required: true, nullable: true }),
    range: new fields.ObjectField({ required: true, nullable: true }),
    rate_of_fire: new fields.ObjectField({ required: true, nullable: true }),
    shots: new fields.ObjectField({ required: true, nullable: true }),
    bulk: new fields.ObjectField({ required: true, nullable: true }),
    recoil: new fields.ObjectField({ required: true, nullable: true }),
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
