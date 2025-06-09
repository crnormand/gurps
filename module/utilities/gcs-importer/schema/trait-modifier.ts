import fields = foundry.data.fields
import { GcsItem, sourcedIdSchema, SourcedIdSchema } from './base.js'

/* ---------------------------------------- */

class GcsTraitModifier extends GcsItem<TraitModifierData> {
  static override metadata = {
    childClass: GcsTraitModifier,
    modifierClass: null, // TraitModifiers do not have modifiers
  }

  /* ---------------------------------------- */

  static override defineSchema(): TraitModifierData {
    return {
      ...sourcedIdSchema(),
      ...traitModifierData(),
    }
  }
}

/* ---------------------------------------- */

const traitModifierData = () => {
  return {
    // START: TraitModifierData
    third_party: new fields.ObjectField(),
    // Change from Gcs' own schema, allowing for recursion of data models
    children: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: TraitModifierData
    // START: TraitModifierEditData
    vtt_notes: new fields.StringField({ required: true, nullable: true }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false })),
    // END: TraitModifierEditData
    // START: TraitModifierSyncData
    name: new fields.StringField({ required: true, nullable: true }),
    reference: new fields.StringField({ required: true, nullable: true }),
    reference_highlight: new fields.StringField({ required: true, nullable: true }),
    local_notes: new fields.StringField({ required: true, nullable: true }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: true,
    }),
    // END: TraitModifierSyncData
    // START: TraitModifierNonContainerSyncData
    cost: new fields.NumberField({ required: true, nullable: true }),
    cost_type: new fields.StringField({ required: true, nullable: true }),
    use_level_from_trait: new fields.BooleanField({ required: true, nullable: true }),
    show_notes_on_weapon: new fields.BooleanField({ required: true, nullable: true }),
    affects: new fields.StringField({ required: true, nullable: true }),
    features: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false })),
    // END: TraitModifierNonContainerSyncData
  }
}

type TraitModifierData = SourcedIdSchema & ReturnType<typeof traitModifierData>

/* ---------------------------------------- */

export { GcsTraitModifier, type TraitModifierData }
