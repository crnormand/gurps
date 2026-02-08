import { fields } from '@gurps-types/foundry/index.js'

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

  /* ---------------------------------------- */

  protected static override _importField(
    data: any,
    field: fields.DataField.Any,
    name: string,
    replacements: Record<string, string>
  ): any {
    switch (name) {
      case 'name':
      case 'local_notes':
      case 'power_source':
      case 'spell_class':
      case 'resist':
      case 'casting_cost':
      case 'maintenance_cost':
      case 'casting_time':
      case 'duration':
      case 'base_skill':
      case 'college':
        return this.processReplacements(data, replacements) ?? field.getInitialValue()
      default:
        return super._importField(data, field, name, replacements)
    }
  }

  /* ---------------------------------------- */

  override get isContainer(): boolean {
    return this.id.startsWith('P')
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
      initial: null,
    }),
    // END: SpellModel

    // START: SpellEditData
    notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    vtt_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    // END: SpellEditData

    // START: SpellSyncData
    name: new fields.StringField({ required: true, nullable: true, initial: null }),
    reference: new fields.StringField({ required: true, nullable: true, initial: null }),
    reference_highlight: new fields.StringField({ required: true, nullable: true, initial: null }),
    local_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
      initial: null,
    }),
    // END: SpellSyncData

    // START: SpellNonContainerOnlyEditData
    tech_level: new fields.StringField({ required: true, nullable: true, initial: null }),
    points: new fields.NumberField({ required: true, nullable: true, initial: null }),
    // STUB: study is not yet supported
    study: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
      initial: null,
    }),
    study_hours_needed: new fields.NumberField({ required: true, nullable: true, initial: null }),
    // END: SpellNonContainerOnlyEditData

    // START: SpellNonContainerOnlySyncData
    difficulty: new fields.StringField({ required: true, nullable: true, initial: null }),
    college: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
      initial: null,
    }),
    power_source: new fields.StringField({ required: true, nullable: true, initial: null }),
    spell_class: new fields.StringField({ required: true, nullable: true, initial: null }),
    resist: new fields.StringField({ required: true, nullable: true, initial: null }),
    casting_cost: new fields.StringField({ required: true, nullable: true, initial: null }),
    maintenance_cost: new fields.StringField({ required: true, nullable: true, initial: null }),
    casting_time: new fields.StringField({ required: true, nullable: true, initial: null }),
    duration: new fields.StringField({ required: true, nullable: true, initial: null }),
    base_skill: new fields.StringField({ required: true, nullable: true, initial: null }),
    prereq_count: new fields.NumberField({ required: true, nullable: true, initial: null }),
    // STUB: prereqs is not yet supported
    prereqs: new fields.ObjectField({ required: true, nullable: true, initial: null }),
    weapons: new fields.ArrayField(new fields.EmbeddedDataField(GcsWeapon, { required: true, nullable: false })),
    //END: SpellNonContainerOnlySyncData
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),

    //START: call
    calc: new fields.SchemaField(
      {
        unsatisfied_reason: new fields.StringField({ required: true, nullable: true, initial: null }),
        resolved_notes: new fields.StringField({ required: true, nullable: true, initial: null }),
        level: new fields.NumberField({ required: true, nullable: true, initial: null }),
        rsl: new fields.StringField({ required: true, nullable: true, initial: null }),
      },
      { required: true, nullable: true, initial: null }
    ),
    // END: calc
  }
}

type SpellModel = SourcedIdSchema & ReturnType<typeof spellData>

/* ---------------------------------------- */

export { GcsSpell, spellData }
