import { IPrereqs, prereqsSchema } from '../../data/mixins/prereqs.ts'
import { IReplaceable, replaceableSchema } from '../../data/mixins/replaceable.ts'
import { IStudies, studiesSchema } from '../../data/mixins/studies.ts'
import { fields } from '../../types/foundry/index.js'

import { GcsBaseItemModel, gcsBaseItemSchema, GcsItemMetadata } from './gcs-base.ts'

class GcsSpellModel extends GcsBaseItemModel<GcsSpellSchema> implements IPrereqs, IReplaceable, IStudies {
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

  // NOTE: Placeholder
  processPrereqs(): void {}
}

const gcsSpellSchema = () => {
  return {
    ...gcsBaseItemSchema(),
    ...prereqsSchema(),
    ...replaceableSchema(),
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
