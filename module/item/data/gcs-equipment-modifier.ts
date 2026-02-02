import { WeightUnit, WeightField } from '../../data/common/weight.ts'
import { featuresSchema, IFeatures } from '../../data/mixins/features.ts'
import { IReplaceable, replaceableSchema } from '../../data/mixins/replaceable.ts'
import { fields } from '../../types/foundry/index.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.ts'

class GcsEquipmentModifierModel
  extends GcsBaseItemModel<GcsEquipmentModifierSchema>
  implements IFeatures, IReplaceable
{
  static override defineSchema(): GcsEquipmentModifierSchema {
    return gcsEquipmentModifierSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): GcsItemMetadata {
    return {
      embedded: { Feature: 'features' },
      type: 'gcsEquipmentModifier',
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

const gcsEquipmentModifierSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...featuresSchema(),
    ...replaceableSchema(), // NOTE: the replaceable field is not used for Equipment Modifiers

    //  type EquipmentModifierEditData struct
    // EquipmentModifierSyncData
    // VTTNotes     string            `json:"vtt_notes,omitzero"`
    // Replacements map[string]string `json:"replacements,omitzero"` // Not actually used any longer, but kept so that we can migrate old data
    // EquipmentModifierEditDataNonContainerOnly
    vttNotes: new fields.StringField({ required: true, nullable: false }),
    //  type EquipmentModifierEditDataNonContainerOnly struct
    // EquipmentModifierNonContainerSyncData
    // Disabled bool `json:"disabled,omitzero"`
    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    //  type EquipmentModifierSyncData struct
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
    //  type EquipmentModifierNonContainerSyncData struct
    // CostType          emcost.Type   `json:"cost_type,omitzero"`
    // CostIsPerLevel    bool          `json:"cost_is_per_level,omitzero"`
    // CostIsPerPound    bool          `json:"cost_is_per_pound,omitzero"`
    // WeightType        emweight.Type `json:"weight_type,omitzero"`
    // WeightIsPerLevel  bool          `json:"weight_is_per_level,omitzero"`
    // ShowNotesOnWeapon bool          `json:"show_notes_on_weapon,omitzero"`
    // TechLevel         string        `json:"tech_level,omitzero"`
    // CostAmount        string        `json:"cost,omitzero"`
    // WeightAmount      string        `json:"weight,omitzero"`
    // Features          Features      `json:"features,omitzero"`
    costType: new fields.StringField({ required: true, nullable: false }),
    costIsPerLevel: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    costIsPerPound: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    weightType: new fields.StringField({ required: true, nullable: false }),
    weightIsPerLevel: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    showNotesOnWeapon: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    techLevel: new fields.StringField({ required: true, nullable: false }),
    costAmount: new fields.StringField({ required: true, nullable: false }),
    weightAmount: new WeightField({ required: true, nullable: false, initial: { unit: WeightUnit.Pound, value: 0 } }),
  }
}

type GcsEquipmentModifierSchema = ReturnType<typeof gcsEquipmentModifierSchema>

/* ---------------------------------------- */

export { GcsEquipmentModifierModel }
