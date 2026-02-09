import { fields } from '@gurps-types/foundry/index.js'
import { featuresSchema, IFeatures } from '@module/data/mixins/features.js'
import { IPrereqs, prereqsSchema } from '@module/data/mixins/prereqs.js'
import { IReplaceable, replaceableSchema } from '@module/data/mixins/replaceable.js'
import { IStudies, studiesSchema } from '@module/data/mixins/studies.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.js'

class GcsTraitModel extends GcsBaseItemModel<GcsTraitSchema> implements IFeatures, IPrereqs, IReplaceable, IStudies {
  static override defineSchema(): GcsTraitSchema {
    return gcsTraitSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): GcsItemMetadata {
    return {
      embedded: { Prereq: 'system.prereqs', Feature: 'system.features' },
      type: 'gcsTrait',
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

const gcsTraitSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...featuresSchema(),
    ...prereqsSchema(),
    ...replaceableSchema(),
    ...studiesSchema(),

    vttNotes: new fields.StringField({ required: true, nullable: false }),
    userDesc: new fields.StringField({ required: true, nullable: false }),
    cr: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
    frequency: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    levels: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    localNotes: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    crAdj: new fields.StringField({ required: true, nullable: false, initial: 0 }),
    basePoints: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
    pointsPerLevel: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
    roundDown: new fields.BooleanField({ required: true, nullable: true, initial: false }),
    canLevel: new fields.BooleanField({ required: true, nullable: true, initial: false }),
    ancestry: new fields.StringField({ required: true, nullable: true }),
    // NOTE: STUB, currently unused.
    // templatePicker: new fields.SchemaField({},{ required: true, nullable: true }),
    containerType: new fields.StringField({ required: true, nullable: true }),
  }
}

type GcsTraitSchema = ReturnType<typeof gcsTraitSchema>

/* ---------------------------------------- */

export { GcsTraitModel }
