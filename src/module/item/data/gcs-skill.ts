import { featuresSchema, IFeatures } from '../../data/mixins/features.ts'
import { IPrereqs, prereqsSchema } from '../../data/mixins/prereqs.ts'
import { IReplaceable, replaceableSchema } from '../../data/mixins/replaceable.ts'
import { IStudies, studiesSchema } from '../../data/mixins/studies.ts'
import { SkillDefault } from '../../data/skill-default.ts'
import { fields } from '../../types/foundry/index.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.ts'

class GcsSkillModel extends GcsBaseItemModel<GcsSkillSchema> implements IFeatures, IPrereqs, IReplaceable, IStudies {
  static override defineSchema(): GcsSkillSchema {
    return gcsSkillSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): GcsItemMetadata {
    return {
      embedded: { Prereq: 'system.prereqs', Feature: 'system.features' },
      type: 'gcsSkill',
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

const gcsSkillSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...featuresSchema(),
    ...prereqsSchema(),
    ...replaceableSchema(),
    ...studiesSchema(),

    vttNotes: new fields.StringField({ required: true, nullable: false }),
    techLevel: new fields.StringField({ required: true, nullable: true }),
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    defaultedFrom: new fields.EmbeddedDataField(SkillDefault, { required: true, nullable: true }),
    localNotes: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    specialization: new fields.StringField({ required: true, nullable: false }),
    difficulty: new fields.StringField({ required: true, nullable: false }),
    encumbrancePenaltyMultiplier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    defaults: new fields.ArrayField(new fields.EmbeddedDataField(SkillDefault, { required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    // NOTE: This name may be confusing, as it's only used for Techniques, just using it as is to stay in line with
    // GCS. It can be changed later if needed.
    default: new fields.EmbeddedDataField(SkillDefault, { required: true, nullable: true }),
  }
}

type GcsSkillSchema = ReturnType<typeof gcsSkillSchema>

/* ---------------------------------------- */

export { GcsSkillModel }
