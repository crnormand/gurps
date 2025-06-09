import fields = foundry.data.fields
import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'
import { GcsTraitModifier } from './trait-modifier.js'
import { GcsWeapon } from './weapon.js'

class GcsTrait extends GcsItem<TraitData> {
  static override metadata = {
    childClass: GcsTrait,
    modifierClass: GcsTraitModifier,
  }

  /* ---------------------------------------- */

  static override defineSchema(): TraitData {
    return {
      ...sourcedIdSchema(),
      ...traitData(),
    }
  }
}

/* ---------------------------------------- */

const traitData = () => {
  return {
    // START: TraitData
    third_party: new fields.ObjectField(),
    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: TraitData
    // START: TraitEditData
    vtt_note: new fields.StringField({ required: true, nullable: true }),
    userdesc: new fields.StringField({ required: true, nullable: true }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    modifiers: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    cr: new fields.StringField({ required: true, nullable: true }),
    disabled: new fields.BooleanField({ required: true, nullable: true }),
    // END: TraitEditData
    // START: TraitSyncData
    name: new fields.StringField({ required: true, nullable: true }),
    reference: new fields.StringField({ required: true, nullable: true }),
    reference_highlight: new fields.StringField({ required: true, nullable: true }),
    local_notes: new fields.StringField({ required: true, nullable: true }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // STUB: prereqs is not yet supported
    prereqs: new fields.ObjectField({ required: true, nullable: true }),
    cr_adj: new fields.StringField({ required: true, nullable: true }),
    // END: TraitSyncData
    // START: TraitContainerSyncData
    ancestry: new fields.StringField({ required: true, nullable: true }),
    template_picker: new fields.ObjectField({ required: true, nullable: true }),
    container_type: new fields.StringField({ required: true, nullable: true }),
    // END: TraitContainerSyncData
    // START: TraitNonContainerOnlyEditData
    levels: new fields.NumberField({ required: true, nullable: true }),
    // STUB: study is not yet supported
    study: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    study_hours_needed: new fields.NumberField({ required: true, nullable: true }),
    // END: TraitNonContainerOnlyEditData
    // START: TraitNonContainerOnlySyncData
    base_points: new fields.NumberField({ required: true, nullable: true }),
    points_per_level: new fields.NumberField({ required: true, nullable: true }),
    weapons: new fields.ArrayField(new fields.EmbeddedDataField(GcsWeapon, { required: true, nullable: false })),
    // STUB: features is not yet supported
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    round_down: new fields.BooleanField({ required: true, nullable: true }),
    can_level: new fields.BooleanField({ required: true, nullable: true }),
    // END: TraitNonContainerOnlySyncData
    // START: calc
    calc: new fields.SchemaField(
      {
        points: new fields.NumberField({ required: true, nullable: false }),
        unsatisfied_reason: new fields.StringField({ required: true, nullable: true }),
        resolved_notes: new fields.StringField({ required: true, nullable: true }),
      },
      { required: true, nullable: true }
    ),
    // END: calc
  }
}

type TraitData = SourcedIdSchema & ReturnType<typeof traitData>

/* ---------------------------------------- */

export { GcsTrait, traitData }
