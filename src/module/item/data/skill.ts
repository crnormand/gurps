import { fields } from '@gurps-types/foundry/index.js'
import { DisplaySkill } from '@gurps-types/gurps/display-item.js'
import { parselink } from '@util/parselink.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

import { ItemType } from '../types.js'

import { BaseItemModel, BaseItemModelSchema, ItemMetadata } from './base.js'

class SkillModel extends BaseItemModel<SkillSchema> {
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
    return foundry.utils.mergeObject(super.metadata, {
      type: ItemType.Skill,
      icon: 'fa-solid fa-person-swimming',
      childTypes: [ItemType.Skill],
      sortKeys: {
        points: 'system.points',
        level: 'system.level',
        relativeLevel: 'system.relativelevel',
      },
      detailsPartial: ['item.partials.details-skill', 'item.partials.details-base'],
    })
  }

  /* ---------------------------------------- */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static override getDefaultArtwork(itemData?: foundry.documents.BaseItem.CreateData): Item.GetDefaultArtworkReturn {
    return { img: 'icons/svg/dice-target.svg' }
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, `GURPS.item.${this.metadata.type}`]

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
      this.level = this.importedLevel

      return
    }

    // Remove extraneous brackets
    otf = otf.match(/^\s*\[(.*)\]\s*$/)?.[1].trim() ?? otf

    // If the OTF is just a number, Set the level directly
    if (otf.match(/^\d+$/)) {
      this.importedLevel = parseInt(otf)
      this.level = this.importedLevel

      return
    }

    // If the OTF is not a number, parse it using the OTF parser.
    const action = parselink(otf)

    // If the OTF does not return an action, we cannot set the level.
    if (!action.action) return

    action.action.calcOnly = true
    action.action.suppressWarnings = true

    const result = GURPS.performAction(action.action, this.actor) as unknown as
      | boolean
      | { target: number; thing: any }
      | Promise<unknown>
      | undefined

    if (
      result &&
      typeof result === 'object' &&
      'then' in result &&
      typeof result.then === 'function'
    ) {
      return
    }

    if (result && typeof result === 'object' && typeof result.target === 'number') {
      this.level = result.target
    }
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
        if (this.item.name.match(makeRegexPatternFrom(bonus.name as string, false))) {
          this.level += bonus.mod as number
        }
      }
    }
  }

  /* ---------------------------------------- */

  override toDisplayItem(): DisplaySkill {
    let fullName = this.parent.name

    if (this.techlevel) fullName += `/TL${this.techlevel}`
    if (this.specialization) fullName += ` (${this.specialization})`

    return foundry.utils.mergeObject(super.toDisplayItem(), {
      techLevel: this.techlevel,
      specialization: this.specialization,
      level: this.level,
      relativeLevel: this.relativelevel,
      fullName,
      points: this.points,
      otf: {
        level: `Sk:"${this.parent.name}"`,
        relativeLevel: `Sk:"${this.parent.name}"`,
      },
    })
  }
}

/* ---------------------------------------- */

const skillSchema = () => {
  return {
    /** The total points spent on this skill */
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The imported "original" level of this skill, which may be used for reference or as a fallback if OTF parsing fails. */
    importedLevel: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

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
