import { IPrereqs, prereqsSchema } from '../../data/mixins/prereqs.ts'
import { IReplaceable, replaceableSchema } from '../../data/mixins/replaceable.ts'
import { IStudies, studiesSchema } from '../../data/mixins/studies.ts'
import { fields } from '../../types/foundry/index.js'

import { GcsBaseItemModel, gcsBaseItemSchema } from './gcs-base.ts'

class GcsSpellModel extends GcsBaseItemModel<GcsSpellSchema> implements IPrereqs, IReplaceable, IStudies {
  static override defineSchema(): GcsSpellSchema {
    return gcsSpellSchema()
  }

  /* ---------------------------------------- */

  // NOTE: Placeholder
  processPrereqs(): void {}
}

const gcsSpellSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...prereqsSchema(),
    ...replaceableSchema(),
    ...studiesSchema(),

    //  type SpellEditData struct
    // SpellSyncData
    // VTTNotes     string            `json:"vtt_notes,omitzero"`
    // Replacements map[string]string `json:"replacements,omitzero"`
    // SpellNonContainerOnlyEditData
    // SkillContainerOnlySyncData
    vttNotes: new fields.StringField({ required: true, nullable: false }),
    // type SpellNonContainerOnlyEditData struct
    // SpellNonContainerOnlySyncData
    // TechLevel        *string     `json:"tech_level,omitzero"`
    // Points           fxp.Int     `json:"points,omitzero"`
    // Study            []*Study    `json:"study,omitzero"`
    // StudyHoursNeeded study.Level `json:"study_hours_needed,omitzero"`
    techLevel: new fields.StringField({ required: true, nullable: true }),
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    // type SpellSyncData struct
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
    // type SpellNonContainerOnlySyncData struct
    // Difficulty      AttributeDifficulty `json:"difficulty,omitzero"`
    // College         CollegeList         `json:"college,omitzero"`
    // PowerSource     string              `json:"power_source,omitzero"`
    // Class           string              `json:"spell_class,omitzero"`
    // Resist          string              `json:"resist,omitzero"`
    // CastingCost     string              `json:"casting_cost,omitzero"`
    // MaintenanceCost string              `json:"maintenance_cost,omitzero"`
    // CastingTime     string              `json:"casting_time,omitzero"`
    // Duration        string              `json:"duration,omitzero"`
    // Item            string              `json:"item,omitzero"`
    // RitualSkillName string              `json:"base_skill,omitzero"`
    // PrereqCount     int                 `json:"prereq_count,omitzero"`
    // Prereq          *PrereqList         `json:"prereqs,omitzero"`
    // Weapons         []*Weapon           `json:"weapons,omitzero"`
    difficulty: new fields.StringField({ required: true, nullable: false }),
    college: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    powerSource: new fields.StringField({ required: true, nullable: false }),
    spellClass: new fields.StringField({ required: true, nullable: false }),
    resist: new fields.StringField({ required: true, nullable: false }),
    castingCost: new fields.StringField({ required: true, nullable: false }),
    maintenanceCost: new fields.StringField({ required: true, nullable: false }),
    castingTime: new fields.StringField({ required: true, nullable: false }),
    duration: new fields.StringField({ required: true, nullable: false }),
    item: new fields.StringField({ required: true, nullable: false }),
    baseSkill: new fields.StringField({ required: true, nullable: false }),
    preqCount: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

type GcsSpellSchema = ReturnType<typeof gcsSpellSchema>

/* ---------------------------------------- */

export { GcsSpellModel }
