import { fields } from '@gurps-types/foundry/index.js'
import { parselink } from '@util/parselink.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

import { BaseItemModel, BaseItemModelSchema, ItemMetadata } from './base.js'

class SkillModel extends BaseItemModel<SkillSchema> {
  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */

  level: number = 0

  /* ---------------------------------------- */
  static override defineSchema(): SkillSchema {
    return {
      ...super.defineSchema(),
      ...skillSchema(),
    }
  }

  /* ---------------------------------------- */

  static override get metadata(): ItemMetadata {
    return {
      embedded: {},
      type: 'skillV2',
      invalidActorTypes: [],
      actions: {},
      childTypes: ['skillV2'],
      modifierTypes: [],
    }
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareBaseData(): void {
    super.prepareBaseData()
    this.#prepareLevelsFromOtf()
  }

  /* ---------------------------------------- */

  /**
   * Prepare the level of this skill based on an OTF formula.
   */
  #prepareLevelsFromOtf(): void {
    let otf = this.otf

    if (otf === '') {
      this.level = this.import

      return
    }

    // Remove extraneous brackets
    otf = otf.match(/^\s*\[(.*)\]\s*$/)?.[1].trim() ?? otf

    // If the OTF is just a number, Set the level directly
    if (otf.match(/^\d+$/)) {
      this.import = parseInt(otf)
      this.level = this.import

      return
    }

    // If the OTF is not a number, parse it using the OTF parser.
    const action = parselink(otf)

    // If the OTF does not return an action, we cannot set the level.
    if (!action.action) return

    action.action.calcOnly = true
    // TODO: verify that target is of type "number" (or replace this whole thing)
    GURPS.performAction(action.action, this.actor).then(
      (result: boolean | { target: number; thing: any } | undefined) => {
        if (result && typeof result === 'object') {
          this.level = result.target
        }
      }
    )
  }

  /* ---------------------------------------- */

  // TODO: Replace AnyObject with a more specific type
  override applyBonuses(bonuses: AnyObject[]): void {
    super.applyBonuses(bonuses)

    for (const bonus of bonuses) {
      // Skills are affected by their base attribute changes
      if (bonus.type === 'attribute') {
        if (this.relativelevel.toUpperCase().startsWith((bonus.attrkey as string).toUpperCase())) {
          this.level += bonus.mod as number
        }
      }

      if (bonus.type === 'skill-spell' && bonus.isRanged) {
        if (this.name.match(makeRegexPatternFrom(bonus.name as string, false))) {
          this.level += bonus.mod as number
        }
      }
    }
  }
}

/* ---------------------------------------- */

const skillSchema = () => {
  return {
    /** The total points spent on this skill */
    points: new fields.NumberField({ required: true, nullable: false }),

    /** The imported "original" level of this skill, which may be used for reference or as a fallback if OTF parsing fails. */
    import: new fields.NumberField({ required: true, nullable: false }),

    /** The specialization of this skill, if any. */
    specialization: new fields.StringField({ required: true, nullable: true, initial: null }),

    /** The tech level of this skill, if any. */
    techlevel: new fields.StringField({ required: true, nullable: true, initial: null }),

    /** The Skill Difficulty of this skill, e.g. "DX/A". */
    difficulty: new fields.StringField({ required: true, nullable: false }),

    /** The level of this skill relative to its controlling attriute, e.g. "DX+1" */
    relativelevel: new fields.StringField({ required: true, nullable: false }),

    /** Any OTF formulas associated witht this skill. */
    otf: new fields.StringField({ required: true, nullable: false }),
  }
}

type SkillSchema = BaseItemModelSchema & ReturnType<typeof skillSchema>

/* ---------------------------------------- */

export { SkillModel, type SkillSchema }
