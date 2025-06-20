import fields = foundry.data.fields
import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'
import { GcsWeapon } from './weapon.js'

class GcsSpell extends GcsItem<SpellModel> {
  static override metadata = {
    childClass: GcsSpell,
    modifierClass: null,
    weaponClass: GcsWeapon,
  }

  /* ---------------------------------------- */

  static override defineSchema(): SpellModel {
    return {
      ...sourcedIdSchema(),
      ...spellData(),
    }
  }
}

/* ---------------------------------------- */

const spellData = () => {
  return {
    // START: SpellModel
    third_party: new fields.ObjectField(),
    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: SpellModel
    // START: SpellEditData
    vtt_note: new fields.StringField({ required: true, nullable: true }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    // END: SpellEditData
    // START: SpellSyncData
    name: new fields.StringField({ required: true, nullable: true }),
    reference: new fields.StringField({ required: true, nullable: true }),
    reference_highlight: new fields.StringField({ required: true, nullable: true }),
    local_notes: new fields.StringField({ required: true, nullable: true }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: SpellSyncData
    // START: SpellNonContianerOnlyEditData
    tech_level: new fields.StringField({ required: true, nullable: true }),
    points: new fields.NumberField({ required: true, nullable: true }),
    // STUB: study is not yet supported
    study: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    study_hours_needed: new fields.NumberField({ required: true, nullable: true }),
    // END: SpellNonContianerOnlyEditData
    // START: SpellNonContianerOnlySyncData
    difficulty: new fields.StringField({ required: true, nullable: true }),
    college: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    power_source: new fields.StringField({ required: true, nullable: true }),
    spell_class: new fields.StringField({ required: true, nullable: true }),
    resist: new fields.StringField({ required: true, nullable: true }),
    casting_cost: new fields.StringField({ required: true, nullable: true }),
    maintenance_cost: new fields.StringField({ required: true, nullable: true }),
    casting_time: new fields.StringField({ required: true, nullable: true }),
    duration: new fields.StringField({ required: true, nullable: true }),
    base_skill: new fields.StringField({ required: true, nullable: true }),
    prereq_count: new fields.NumberField({ required: true, nullable: true }),
    // STUB: prereqs is not yet supported
    prereqs: new fields.ObjectField({ required: true, nullable: true }),
    weapons: new fields.ArrayField(new fields.EmbeddedDataField(GcsWeapon, { required: true, nullable: false })),
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

type SpellModel = SourcedIdSchema & ReturnType<typeof spellData>

/* ---------------------------------------- */

export { GcsSpell, spellData }
