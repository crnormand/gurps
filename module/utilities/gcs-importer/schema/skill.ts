import fields = foundry.data.fields
import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'
import { GcsSkillDefault, SkillDefaultData } from './skill-default.js'
import { GcsWeapon } from './weapon.js'
import DataModel = foundry.abstract.DataModel

class GcsSkill extends GcsItem<SkillData> {
  static override metadata = {
    childClass: GcsSkill,
    modifierClass: null,
  }

  /* ---------------------------------------- */

  static override defineSchema(): SkillData {
    return {
      ...sourcedIdSchema(),
      ...skillData(),
    }
  }

  /* ---------------------------------------- */

  protected static override _importField(data: any, field: fields.DataField.Any): any {
    if (field.name === 'defaults') {
      return data[field.name].map((defaultData: Partial<DataModel.CreateData<SkillDefaultData>>[]) => {
        return GcsSkillDefault.fromImportData(defaultData as any, GcsSkillDefault.schema.fields)
      })
    }
    return super._importField(data, field)
  }
}

/* ---------------------------------------- */

const skillData = () => {
  return {
    // START: SkillData
    third_party: new fields.ObjectField(),
    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: SkillData
    // START: SkillEditData
    vtt_note: new fields.StringField({ required: true, nullable: true }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    // END: SkillEditData
    // START: SkillSyncData
    name: new fields.StringField({ required: true, nullable: true }),
    reference: new fields.StringField({ required: true, nullable: true }),
    reference_highlight: new fields.StringField({ required: true, nullable: true }),
    local_notes: new fields.StringField({ required: true, nullable: true }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: SkillSyncData
    // START: SkillContainerSyncData
    template_picker: new fields.ObjectField({ required: true, nullable: true }),
    // END: SkillContainerSyncData
    // START: SkillNonContianerOnlyEditData
    tech_level: new fields.StringField({ required: true, nullable: true }),
    points: new fields.NumberField({ required: true, nullable: true }),
    defaulted_from: new fields.ObjectField({ required: true, nullable: true }),
    // STUB: study is not yet supported
    study: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    study_hours_needed: new fields.NumberField({ required: true, nullable: true }),
    // END: SkillNonContianerOnlyEditData
    // START: SkillNonContianerOnlySyncData
    specialization: new fields.StringField({ required: true, nullable: true }),
    difficulty: new fields.StringField({ required: true, nullable: true }),
    encumbrance_penalty_multiplier: new fields.NumberField({ required: true, nullable: true }),
    defaults: new fields.ArrayField(new fields.EmbeddedDataField(GcsSkillDefault, { required: true, nullable: false })),
    default: new fields.EmbeddedDataField(GcsSkillDefault, { required: true, nullable: true }),
    limit: new fields.NumberField({ required: true, nullable: true }),
    // STUB: prereqs is not yet supported
    prereqs: new fields.ObjectField({ required: true, nullable: true }),
    weapons: new fields.ArrayField(new fields.EmbeddedDataField(GcsWeapon, { required: true, nullable: false })),
    // STUB: features is not yet supported
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    // END: SkillNonContianerOnlySyncData
    // START: calc
    calc: new fields.SchemaField(
      {
        unsatisfied_reason: new fields.StringField({ required: true, nullable: true }),
        resolved_notes: new fields.StringField({ required: true, nullable: true }),
        level: new fields.NumberField({ required: true, nullable: false }),
        rsl: new fields.StringField({ required: true, nullable: false }),
      },
      { required: true, nullable: true }
    ),
    // END: calc
  }
}

type SkillData = SourcedIdSchema & ReturnType<typeof skillData>

/* ---------------------------------------- */

export { GcsSkill, skillData }
