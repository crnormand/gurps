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
      embedded: { Feature: 'system.features' },
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
    // NOTE: the `replaceable` field is not used for Trait Modifiers.
    // TraitModifiers uses the IReplaceable functionality but the strings
    // which replace the placeholder values in its fields are always inherited
    // from a parent Trait Item, so the `replaceable` field is never used.
    ...replaceableSchema(),

    vttNotes: new fields.StringField({ required: true, nullable: false }),
    levels: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    localNotes: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    costAdj: new fields.StringField({ required: true, nullable: false }),
    useLevelFromTrait: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    showNotesOnWeapon: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    affects: new fields.StringField({ required: true, nullable: false }),
  }
}

type GcsTraitModifierSchema = ReturnType<typeof gcsTraitModifierSchema>

/* ---------------------------------------- */

export { GcsTraitModifierModel }
