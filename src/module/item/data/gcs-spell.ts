import { fields } from '@gurps-types/foundry/index.js'
import { INameable, INameableApplier, nameableSchema } from '@module/data/mixins/nameable.js'
import { IPrereqs, prereqsSchema } from '@module/data/mixins/prereqs.js'
import { IStudies, studiesSchema } from '@module/data/mixins/studies.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.js'

class GcsSpellModel
  extends GcsBaseItemModel<GcsSpellSchema, INameable.AccesserBaseData>
  implements IPrereqs, INameableApplier, IStudies
{
  nameWithReplacements: string = ''
  localNotesWithReplacements: string = ''
  powerSourceWithReplacements: string = ''
  spellClassWithReplacements: string = ''
  resistWithReplacements: string = ''
  castingCostWithReplacements: string = ''
  maintenanceCostWithReplacements: string = ''
  castingTimeWithReplacements: string = ''
  durationWithReplacements: string = ''
  itemWithReplacements: string = ''
  ritualSkillNameWithReplacements: string = ''
  collegeWithReplacements: string[] = []

  /* ---------------------------------------- */

  static override defineSchema(): GcsSpellSchema {
    return gcsSpellSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): GcsItemMetadata {
    return {
      embedded: { Prereq: 'system.prereqs' },
      type: 'gcsSpell',
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
    INameable.extract.call(this, this.powerSource, map, existing)
    INameable.extract.call(this, this.spellClass, map, existing)
    INameable.extract.call(this, this.resist, map, existing)
    INameable.extract.call(this, this.castingCost, map, existing)
    INameable.extract.call(this, this.maintenanceCost, map, existing)
    INameable.extract.call(this, this.castingTime, map, existing)
    INameable.extract.call(this, this.duration, map, existing)
    INameable.extract.call(this, this.spellItem, map, existing)
    INameable.extract.call(this, this.baseSkill, map, existing)
    INameable.extract.call(this, this.college, map, existing)

    this.nameableReplacements = map
  }

  /* ---------------------------------------- */

  applyNameableKeys(): void {
    this.nameWithReplacements = INameable.apply.call(this, this.parent.name)
    this.localNotesWithReplacements = INameable.apply.call(this, this.localNotes)
    this.powerSourceWithReplacements = INameable.apply.call(this, this.powerSource)
    this.spellClassWithReplacements = INameable.apply.call(this, this.spellClass)
    this.resistWithReplacements = INameable.apply.call(this, this.resist)
    this.castingCostWithReplacements = INameable.apply.call(this, this.castingCost)
    this.maintenanceCostWithReplacements = INameable.apply.call(this, this.maintenanceCost)
    this.castingTimeWithReplacements = INameable.apply.call(this, this.castingTime)
    this.durationWithReplacements = INameable.apply.call(this, this.duration)
    this.itemWithReplacements = INameable.apply.call(this, this.spellItem)
    this.ritualSkillNameWithReplacements = INameable.apply.call(this, this.baseSkill)
    this.collegeWithReplacements = INameable.applyToArray.call(this, this.college)
  }

  /* ---------------------------------------- */

  // NOTE: Placeholder
  processPrereqs(): void {}
}

const gcsSpellSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...prereqsSchema(),
    ...nameableSchema(),
    ...studiesSchema(),

    vttNotes: new fields.StringField({ required: true, nullable: false }),
    techLevel: new fields.StringField({ required: true, nullable: true }),
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    localNotes: new fields.StringField({ required: true, nullable: false }),
    tags: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
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
    spellItem: new fields.StringField({ required: true, nullable: false }),
    baseSkill: new fields.StringField({ required: true, nullable: false }),
    prereqCount: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

type GcsSpellSchema = ReturnType<typeof gcsSpellSchema>

/* ---------------------------------------- */

export { GcsSpellModel }
