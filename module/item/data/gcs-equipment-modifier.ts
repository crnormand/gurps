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
      embedded: { Feature: 'system.features' },
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
    // NOTE: the `replaceable` field is not used for Equipment Modifiers.
    // EquipmentModifiers uses the IReplaceable functionality but the strings
    // which replace the placeholder values in its fields are always inherited
    // from a parent Equipment Item, so the `replaceable` field is never used.
    ...replaceableSchema(),

    vttNotes: new fields.StringField({ required: true, nullable: false }),
    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    localNotes: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
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
