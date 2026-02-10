import { fields } from '@gurps-types/foundry/index.js'
import { featuresSchema, IFeatures } from '@module/data/mixins/features.js'
import { INameable, INameableApplier, nameableSchema } from '@module/data/mixins/nameable.js'
import { IPrereqs, prereqsSchema } from '@module/data/mixins/prereqs.js'
import { IStudies, studiesSchema } from '@module/data/mixins/studies.js'
import { SkillDefault } from '@module/data/skill-default.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.ts'

class GcsSkillModel
  extends GcsBaseItemModel<GcsSkillSchema, INameable.AccesserBaseData>
  implements IFeatures, IPrereqs, INameableApplier, IStudies
{
  nameWithReplacements: string = ''
  localNotesWithReplacements: string = ''
  specializationWithReplacements: string = ''

  /* ---------------------------------------- */

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

  override prepareBaseData(): void {
    this.fillWithNameableKeys(new Map())
    this.applyNameableKeys()
  }

  /* ---------------------------------------- */

  fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    existing ??= new Map(Object.entries(this.replacements))

    INameable.extract.call(this, this.parent.name, map, existing)
    INameable.extract.call(this, this.localNotes, map, existing)
    INameable.extract.call(this, this.specialization, map, existing)

    this.nameableReplacements = map
  }

  /* ---------------------------------------- */

  applyNameableKeys(): void {
    this.nameWithReplacements = INameable.apply.call(this, this.parent.name)
    this.localNotesWithReplacements = INameable.apply.call(this, this.localNotes)
    this.specializationWithReplacements = INameable.apply.call(this, this.specialization)
  }

  /* ---------------------------------------- */

  // NOTE: Placeholder
  applyBonuses(): void {}

  /* ---------------------------------------- */

  // NOTE: Placeholder
  processPrereqs(): void {}

  /* ---------------------------------------- */

  // NOTE: This is a rather tricky derived property to implement. It should exist in some state
  // before prerequisites and featues are accounted for, but its value may be
  // influenced by prerequisites and features
  get level(): number {
    // NOTE: Placeholder
    return 0
  }
}

const gcsSkillSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...featuresSchema(),
    ...prereqsSchema(),
    ...nameableSchema(),
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
