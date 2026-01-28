import { WeightUnit, WeightField } from '../../data/common/weight.ts'
import { featureHolderSchema, IFeatureHolder } from '../../data/mixins/feature-holder.ts'
import { IPrereqHolder, prereqHolderSchema } from '../../data/mixins/prereq-holder.ts'
import { fields } from '../../types/foundry/index.js'

import { GcsBaseItemModel, gcsBaseItemSchema } from './gcs-base.ts'

class GcsEquipmentModel extends GcsBaseItemModel<GcsEquipmentSchema> implements IFeatureHolder, IPrereqHolder {
  static override defineSchema(): GcsEquipmentSchema {
    return gcsEquipmentSchema()
  }

  /* ---------------------------------------- */

  // NOTE: Placeholder
  applyBonuses(): void {}

  /* ---------------------------------------- */

  // NOTE: Placeholder
  processPrereqs(): void {}
}

const gcsEquipmentSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...featureHolderSchema(),
    ...prereqHolderSchema(),

    carried: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    //  type EquipmentEditData struct
    // EquipmentSyncData
    // VTTNotes     string               `json:"vtt_notes,omitzero"`
    // Replacements map[string]string    `json:"replacements,omitzero"`
    // Modifiers    []*EquipmentModifier `json:"modifiers,omitzero"`
    // RatedST      fxp.Int              `json:"rated_strength,omitzero"`
    // Quantity     fxp.Int              `json:"quantity"`
    // Level        fxp.Int              `json:"level,omitzero"`
    // Uses         int                  `json:"uses,omitzero"`
    // Equipped     bool                 `json:"equipped,omitzero"`
    vttNotes: new fields.StringField({ required: true, nullable: false }),
    replacements: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    ratedStrength: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    quantity: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
    level: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    uses: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    equipped: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    //  type EquipmentSyncData struct
    // Name                   string      `json:"description,omitzero"`
    // PageRef                string      `json:"reference,omitzero"`
    // PageRefHighlight       string      `json:"reference_highlight,omitzero"`
    // LocalNotes             string      `json:"local_notes,omitzero"`
    // TechLevel              string      `json:"tech_level,omitzero"`
    // LegalityClass          string      `json:"legality_class,omitzero"`
    // Tags                   []string    `json:"tags,omitzero"`
    // BaseValue              string      `json:"base_value,omitzero"`
    // BaseWeight             string      `json:"base_weight,omitzero"`
    // MaxUses                int         `json:"max_uses,omitzero"`
    // Prereq                 *PrereqList `json:"prereqs,omitzero"`
    // Weapons                []*Weapon   `json:"weapons,omitzero"`
    // Features               Features    `json:"features,omitzero"`
    // WeightIgnoredForSkills bool        `json:"ignore_weight_for_skills,omitzero"`
    // NOTE: Not used: Use Item.name instead
    // name: new fields.StringField({required:true,nullable: false}),
    reference: new fields.StringField({ required: true, nullable: false }),
    referenceHighlight: new fields.StringField({ required: true, nullable: false }),
    localNotes: new fields.StringField({ required: true, nullable: false }),
    techLevel: new fields.StringField({ required: true, nullable: false }),
    legalityClass: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false })),
    baseValue: new fields.StringField({ required: true, nullable: false }),
    baseWeight: new WeightField({
      required: true,
      nullable: false,
      initial: { value: 0, unit: WeightUnit.Pound },
    }),
    maxUses: new fields.NumberField({ required: true, nullable: false }),
    ignoreWeightForSkills: new fields.BooleanField({ required: true, nullable: false }),
  }
}

type GcsEquipmentSchema = ReturnType<typeof gcsEquipmentSchema>

/* ---------------------------------------- */

export { GcsEquipmentModel }
