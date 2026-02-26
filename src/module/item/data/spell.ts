import { fields } from '@gurps-types/foundry/index.js'
import { parselink } from '@util/parselink.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

import { BaseItemModel, BaseItemModelSchema, ItemMetadata } from './base.js'

class SpellModel extends BaseItemModel<SpellSchema> {
  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */

  level: number = 0

  /* ---------------------------------------- */

  static override defineSchema(): SpellSchema {
    return {
      ...super.defineSchema(),
      ...spellSchema(),
    }
  }

  /* ---------------------------------------- */

  static override get metadata(): ItemMetadata {
    return {
      embedded: {},
      type: 'spellV2',
      invalidActorTypes: [],
      actions: {},
      childTypes: ['spellV2'],
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

const spellSchema = () => {
  return {
    /** The total points spent on this spell */
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The imported "original" level of this spell, which may be used for reference or as a fallback if OTF parsing fails. */
    import: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The spell class of this spell, */
    class: new fields.StringField({ required: true, nullable: false }),

    /** A comma-separated list of colleges this spell belongs to. */
    college: new fields.StringField({ required: true, nullable: false }),

    /** The casting cost of this spell */
    cost: new fields.StringField({ required: true, nullable: false }),

    /** The maintenance cost of this spell */
    maintain: new fields.StringField({ required: true, nullable: false }),

    /** The duration of this spell's effects */
    duration: new fields.StringField({ required: true, nullable: false }),

    /** The resist roll for this spell, if any */
    resist: new fields.StringField({ required: true, nullable: false }),

    /** The casting time of this spell, if any */
    casttime: new fields.StringField({ required: true, nullable: false }),

    /** The Skill Difficulty of this spell, e.g. "IQ/H". */
    difficulty: new fields.StringField({ required: true, nullable: false }),

    /** The level of this spell relative to its controlling attriute, e.g. "IQ-2" */
    relativelevel: new fields.StringField({ required: true, nullable: false }),

    /** Any OTF formulas associated witht this spell. */
    otf: new fields.StringField({ required: true, nullable: false }),
  }
}

type SpellSchema = BaseItemModelSchema & ReturnType<typeof spellSchema>

/* ---------------------------------------- */

export { SpellModel, type SpellSchema }
