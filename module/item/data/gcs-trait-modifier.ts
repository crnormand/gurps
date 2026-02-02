import { featuresSchema, IFeatures } from '../../data/mixins/features.ts'
import { IReplaceable, replaceableSchema } from '../../data/mixins/replaceable.ts'
import { fields } from '../../types/foundry/index.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.ts'

class GcsTraitModifierModel extends GcsBaseItemModel<GcsTraitModifierSchema> implements IFeatures, IReplaceable {
  static override defineSchema(): GcsTraitModifierSchema {
    return gcsTraitModifierSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): GcsItemMetadata {
    return {
      embedded: { Feature: 'features' },
      type: 'gcsTraitModifier',
      invalidActorTypes: [],
      actions: {},
      childTypes: [],
      modifierTypes: [],
    }
  }

  /* ---------------------------------------- */

  // NOTE: Placeholder
  applyBonuses(): void {}
}

const gcsTraitModifierSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...featuresSchema(),
    ...replaceableSchema(), // NOTE: the replaceable field is not used for Trait Modifiers

    // type TraitModifierEditData struct
    // TraitModifierSyncData
    // VTTNotes     string            `json:"vtt_notes,omitzero"`
    // Replacements map[string]string `json:"replacements,omitzero"` // Not actually used any longer, but kept so that we can migrate old data
    // TraitModifierEditDataNonContainerOnly
    vttNotes: new fields.StringField({ required: true, nullable: false }),
    // type TraitModifierEditDataNonContainerOnly struct
    // TraitModifierNonContainerSyncData
    // Levels   fxp.Int `json:"levels,omitzero"`
    // Disabled bool    `json:"disabled,omitzero"`
    levels: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    // type TraitModifierSyncData struct
    // Name             string   `json:"name,omitzero"`
    // PageRef          string   `json:"reference,omitzero"`
    // PageRefHighlight string   `json:"reference_highlight,omitzero"`
    // LocalNotes       string   `json:"local_notes,omitzero"`
    // Tags             []string `json:"tags,omitzero"`
    localNotes: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    // type TraitModifierNonContainerSyncData struct
    // CostAdj           string         `json:"cost_adj,omitzero"`
    // UseLevelFromTrait bool           `json:"use_level_from_trait,omitzero"`
    // ShowNotesOnWeapon bool           `json:"show_notes_on_weapon,omitzero"`
    // Affects           affects.Option `json:"affects,omitzero"`
    // Features          Features       `json:"features,omitzero"`
    costAdj: new fields.StringField({ required: true, nullable: false }),
    useLevelFromTrait: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    showNotesOnWeapon: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    affects: new fields.StringField({ required: true, nullable: false }),
  }
}

type GcsTraitModifierSchema = ReturnType<typeof gcsTraitModifierSchema>

/* ---------------------------------------- */

export { GcsTraitModifierModel }
