import fields = foundry.data.fields
import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'
import { GcsSkillDefault } from './skill-default.js'
import { GcsWeapon } from './weapon.js'
import { AnyObject } from 'fvtt-types/utils'

class GcsSkill extends GcsItem<SkillModel> {
  static override metadata = {
    childClass: GcsSkill,
    modifierClass: null,
    weaponClass: GcsWeapon,
  }

  /* ---------------------------------------- */

  static override defineSchema(): SkillModel {
    return {
      ...sourcedIdSchema(),
      ...skillData(),
    }
  }

  /* ---------------------------------------- */

  override get isContainer(): boolean {
    return this.id.startsWith('S')
  }

  /* ---------------------------------------- */

  protected static override _importField(
    data: any,
    field: fields.DataField.Any,
    name: string,
    replacements: Record<string, string>
  ): any {
    switch (name) {
      case 'defaults':
        return data?.map((defaultData: AnyObject) => GcsSkillDefault.fromImportData(defaultData as any))
      case 'name':
      case 'specialization':
      case 'local_notes':
        return this.processReplacements(data, replacements) ?? field.getInitialValue()
      default:
        return super._importField(data, field, name, replacements)
    }
  }
}

/* ---------------------------------------- */

const skillData = () => {
  return {
    // START: SkillModel

    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
      initial: null,
    }),
    notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    vtt_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    weapons: new fields.ArrayField(new fields.EmbeddedDataField(GcsWeapon, { required: true, nullable: false })),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    // END: SkillModel

    // START: SkillSyncData
    name: new fields.StringField({ required: true, nullable: true, initial: null }),
    reference: new fields.StringField({ required: true, nullable: true, initial: null }),
    local_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    // END: SkillSyncData

    // START: SkillNonContainerOnlyEditData
    tech_level: new fields.StringField({ required: true, nullable: true, initial: null }),
    points: new fields.NumberField({ required: true, nullable: true, initial: null }),
    defaulted_from: new fields.ObjectField({ required: true, nullable: true, initial: null }),
    // END: SkillNonContainerOnlyEditData

    // START: SkillNonContainerOnlySyncData
    specialization: new fields.StringField({ required: true, nullable: true, initial: null }),
    difficulty: new fields.StringField({ required: true, nullable: true, initial: null }),
    defaults: new fields.ArrayField(new fields.EmbeddedDataField(GcsSkillDefault, { required: true, nullable: false })),
    default: new fields.EmbeddedDataField(GcsSkillDefault, { required: true, nullable: true, initial: null }),
    // STUB: features is not yet supported
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    // END: SkillNonContainerOnlySyncData

    // START: calc
    calc: new fields.SchemaField(
      {
        resolved_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
        level: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        rsl: new fields.StringField({ required: true, nullable: false }),
      },
      { required: false, nullable: true, initial: null }
    ),
    // END: calc
  }
}

type SkillModel = SourcedIdSchema & ReturnType<typeof skillData>

/* ---------------------------------------- */

export { GcsSkill, skillData }
