import { WeightUnit, WeightField } from '../../data/common/weight.ts'
import { featuresSchema, IFeatures } from '../../data/mixins/features.ts'
import { IPrereqs, prereqsSchema } from '../../data/mixins/prereqs.ts'
import { IReplaceable, replaceableSchema } from '../../data/mixins/replaceable.ts'
import { fields } from '../../types/foundry/index.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.ts'

class GcsEquipmentModel extends GcsBaseItemModel<GcsEquipmentSchema> implements IFeatures, IPrereqs, IReplaceable {
  static override defineSchema(): GcsEquipmentSchema {
    return gcsEquipmentSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): GcsItemMetadata {
    return {
      embedded: { Prereq: 'system.prereqs', Feature: 'system.features' },
      type: 'gcsEquipment',
      invalidActorTypes: [],
      actions: {},
      childTypes: [],
      modifierTypes: [],
    }
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
    ...featuresSchema(),
    ...prereqsSchema(),
    ...replaceableSchema(),

    carried: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    vttNotes: new fields.StringField({ required: true, nullable: false }),
    ratedStrength: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    quantity: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
    level: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    uses: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    equipped: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    // NOTE: Not used: Use Item.name instead
    // name: new fields.StringField({required:true,nullable: false}),
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
    maxUses: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    ignoreWeightForSkills: new fields.BooleanField({ required: true, nullable: false }),
  }
}

type GcsEquipmentSchema = ReturnType<typeof gcsEquipmentSchema>

/* ---------------------------------------- */

export { GcsEquipmentModel }
