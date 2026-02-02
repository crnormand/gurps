import { featuresSchema, IFeatures } from '../../data/mixins/features.ts'
import { IPrereqs, prereqsSchema } from '../../data/mixins/prereqs.ts'
import { IReplaceable, replaceableSchema } from '../../data/mixins/replaceable.ts'
import { IStudies, studiesSchema } from '../../data/mixins/studies.ts'
import { fields } from '../../types/foundry/index.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.ts'

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

    //  type TraitEditData struct
    // TraitSyncData
    // VTTNotes     string            `json:"vtt_notes,omitzero"`
    // UserDesc     string            `json:"userdesc,omitzero"`
    // Replacements map[string]string `json:"replacements,omitzero"`
    // Modifiers    []*TraitModifier  `json:"modifiers,omitzero"`
    // SelfControl  selfctrl.Roll     `json:"cr,omitzero"`
    // Frequency    frequency.Roll    `json:"frequency,omitzero"`
    // Disabled     bool              `json:"disabled,omitzero"`
    // TraitNonContainerOnlyEditData
    // TraitContainerSyncData
    vttNotes: new fields.StringField({ required: true, nullable: false }),
    userDesc: new fields.StringField({ required: true, nullable: false }),
    cr: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
    frequency: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    //  type TraitNonContainerOnlyEditData struct
    // TraitNonContainerSyncData
    // Levels           fxp.Int     `json:"levels,omitzero"`
    // Study            []*Study    `json:"study,omitzero"`
    // StudyHoursNeeded study.Level `json:"study_hours_needed,omitzero"`
    levels: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    //  type TraitSyncData struct
    // Name             string              `json:"name,omitzero"`
    // PageRef          string              `json:"reference,omitzero"`
    // PageRefHighlight string              `json:"reference_highlight,omitzero"`
    // LocalNotes       string              `json:"local_notes,omitzero"`
    // Tags             []string            `json:"tags,omitzero"`
    // Prereq           *PrereqList         `json:"prereqs,omitzero"`
    // SelfControlAdj   selfctrl.Adjustment `json:"cr_adj,omitzero"`
    localNotes: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    crAdj: new fields.StringField({ required: true, nullable: false, initial: 0 }),
    //  type TraitNonContainerSyncData struct
    // BasePoints     fxp.Int   `json:"base_points,omitzero"`
    // PointsPerLevel fxp.Int   `json:"points_per_level,omitzero"`
    // Weapons        []*Weapon `json:"weapons,omitzero"`
    // Features       Features  `json:"features,omitzero"`
    // RoundCostDown  bool      `json:"round_down,omitzero"`
    // CanLevel       bool      `json:"can_level,omitzero"`
    basePoints: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
    pointsPerLevel: new fields.NumberField({ required: true, nullable: true, initial: 0 }),
    roundDown: new fields.BooleanField({ required: true, nullable: true, initial: false }),
    canLevel: new fields.BooleanField({ required: true, nullable: true, initial: false }),
    //  type TraitContainerSyncData struct
    // Ancestry       string          `json:"ancestry,omitzero"`
    // TemplatePicker *TemplatePicker `json:"template_picker,omitzero"`
    // ContainerType  container.Type  `json:"container_type,omitzero"`
    ancestry: new fields.StringField({ required: true, nullable: true }),
    // templatePicker: new fields.SchemaField({},{ required: true, nullable: true }), // NOTE: STUB, currently unused.
    containerType: new fields.StringField({ required: true, nullable: true }),
  }
}

type GcsTraitSchema = ReturnType<typeof gcsTraitSchema>

/* ---------------------------------------- */

export { GcsTraitModel }
