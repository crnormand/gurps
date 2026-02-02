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
      embedded: { Prereq: 'prereqs', Feature: 'features' },
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

    //  type SkillEditData struct
    // SkillSyncData
    // VTTNotes     string            `json:"vtt_notes,omitzero"`
    // Replacements map[string]string `json:"replacements,omitzero"`
    // SkillNonContainerOnlyEditData
    // SkillContainerOnlySyncData
    vttNotes: new fields.StringField({ required: true, nullable: false }),
    //  type SkillNonContainerOnlyEditData struct
    // SkillNonContainerOnlySyncData
    // TechLevel        *string       `json:"tech_level,omitzero"`
    // Points           fxp.Int       `json:"points,omitzero"`
    // DefaultedFrom    *SkillDefault `json:"defaulted_from,omitzero"`
    // Study            []*Study      `json:"study,omitzero"`
    // StudyHoursNeeded study.Level   `json:"study_hours_needed,omitzero"`
    techLevel: new fields.StringField({ required: true, nullable: true }),
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    defaultedFrom: new fields.EmbeddedDataField(SkillDefault, { required: true, nullable: true }),
    //  type SkillSyncData struct
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
    //  type SkillNonContainerOnlySyncData struct
    // Specialization               string              `json:"specialization,omitzero"`
    // Difficulty                   AttributeDifficulty `json:"difficulty,omitzero"`
    // EncumbrancePenaltyMultiplier fxp.Int             `json:"encumbrance_penalty_multiplier,omitzero"`
    // Defaults                     []*SkillDefault     `json:"defaults,omitzero"`
    // TechniqueDefault             *SkillDefault       `json:"default,omitzero"`
    // TechniqueLimitModifier       *fxp.Int            `json:"limit,omitzero"`
    // Prereq                       *PrereqList         `json:"prereqs,omitzero"`
    // Weapons                      []*Weapon           `json:"weapons,omitzero"`
    // Features                     Features            `json:"features,omitzero"`
    specialization: new fields.StringField({ required: true, nullable: false }),
    difficulty: new fields.StringField({ required: true, nullable: false }),
    encumbrancePenaltyMultiplier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    defaults: new fields.ArrayField(new fields.EmbeddedDataField(SkillDefault, { required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    // NOTE: This name may be confusing, as it's only used for Techniques, just using it as is to stay in line with GCS.
    default: new fields.EmbeddedDataField(SkillDefault, { required: true, nullable: true }),
    //  type SkillContainerOnlySyncData struct
    // TemplatePicker *TemplatePicker `json:"template_picker,omitzero"`
  }
}

type GcsSkillSchema = ReturnType<typeof gcsSkillSchema>

/* ---------------------------------------- */

export { GcsSkillModel }
