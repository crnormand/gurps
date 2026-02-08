
import * as Settings from '@util/miscellaneous-settings.js'
import { parselink } from '@util/parselink.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

import { ItemComponent, ItemComponentSchema } from '../item/data/component.js'
import { fields } from '../types/foundry/index.js'

import { BaseAction, BaseActionSchema } from './base-action.js'

// TODO There is significant overlap between Melee and Ranged attacks; consider a shared base class.
class RangedAttackModel extends BaseAction<RangedAttackSchema> {
  declare rng: RangedAttackComponent
  static override defineSchema(): RangedAttackSchema {
    return {
      ...super.defineSchema(),
      ...rangedAttackSchema(),
    }
  }

  /* ---------------------------------------- */

  static override get TYPE(): string {
    return 'rangedAttack'
  }

  /* ---------------------------------------- */

  get component(): RangedAttackComponent {
    return this.rng
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
    let otf = this.component.otf

    if (otf === '') {
      this.component.level = this.component.import

      return
    }

    // Remove extraneous brackets
    otf = otf.match(/^\s*\[(.*)\]\s*$/)?.[1].trim() ?? otf

    // If the OTF is just a number, Set the level directly
    if (otf.match(/^\d+$/)) {
      this.component.import = parseInt(otf)
      this.component.level = this.component.import

      return
    }

    // If the OTF is not a number, parse it using the OTF parser.
    const action = parselink(otf)

    // If the OTF does not return an action, we cannot set the level.
    if (!action.action) {
      console.warn(`GURPS | RangedAttackModel: OTF "${otf}" did not return a valid action.`)

      return
    }

    action.action.calcOnly = true
    // TODO: verify that target is of type "number" (or replace this whole thing)
    GURPS.performAction(action.action, this.actor).then(
      (result: boolean | { target: number; thing: any } | undefined) => {
        if (result && typeof result === 'object') {
          this.component.level = result.target
        }
      }
    )
  }

  /* ---------------------------------------- */

  override prepareDerivedData(): void {
    super.prepareDerivedData()

    const actor = this.actor as Actor<'characterV2'> | null

    if (!actor) return
    this.convertRanges(actor.system.attributes.ST.value)
  }

  /* ---------------------------------------- */

  convertRanges(st: number): void {
    if (game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_CONVERT_RANGED) === false) return

    const range = this.component.range
    // Match the range format, e.g., "x2", "x20", "x30"
    const matchSingle = range.match(/^\s*[×xX]([\d.]+)\s*$/)
    const matchMultiple = range.match(/^\s*[×xX]([\d.]+)\s*-\s*[×xX]([\d.]+)\s*$/)

    if (matchSingle) {
      this.component.range = `${parseFloat(matchSingle[1]) * st}`
    } else if (matchMultiple) {
      const newRangeStart = parseFloat(matchMultiple[1]) * st
      const newRangeEnd = parseFloat(matchMultiple[2]) * st

      this.component.range = `${newRangeStart} - ${newRangeEnd}`
    }
  }

  /* ---------------------------------------- */

  override applyBonuses(bonuses: AnyObject[]): void {
    for (const bonus of bonuses) {
      // All melee attacks are affected by DX
      if (bonus.type === 'attribute' && bonus.attrkey === 'DX') {
        this.component.level += bonus.mod as number
      }

      if (bonus.type === 'attack' && bonus.isRanged) {
        if (this.component.name.match(makeRegexPatternFrom(bonus.name as string, false))) {
          this.component.level += bonus.mod as number
        }
      }
    }
  }
}

/* ---------------------------------------- */

const rangedAttackSchema = () => {
  return {
    rng: new fields.EmbeddedDataField(RangedAttackComponent, { required: true, nullable: false }),
  }
}

type RangedAttackSchema = BaseActionSchema & ReturnType<typeof rangedAttackSchema>

/* ---------------------------------------- */

const rangedAttackComponentSchema = () => {
  return {
    // NOTE: change from previous schema where this was a string
    import: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    // NOTE: no longer persistent data, always derived from import value
    // level: new fields.NumberField({ required: true, nullable: false }),
    damage: new fields.StringField({ required: true, nullable: false }),
    st: new fields.StringField({ required: true, nullable: false }),
    mode: new fields.StringField({ required: true, nullable: false }),
    notes: new fields.StringField({ required: true, nullable: false }),
    bulk: new fields.StringField({ required: true, nullable: false }),
    legalityclass: new fields.StringField({ required: true, nullable: false }),
    ammo: new fields.StringField({ required: true, nullable: false }),
    acc: new fields.StringField({ required: true, nullable: false }),
    range: new fields.StringField({ required: true, nullable: false }),
    shots: new fields.StringField({ required: true, nullable: false }),
    rcl: new fields.StringField({ required: true, nullable: false }),
    halfd: new fields.StringField({ required: true, nullable: false }),
    max: new fields.StringField({ required: true, nullable: false }),
    otf: new fields.StringField({ required: true, nullable: false }),
    itemModifiers: new fields.StringField({ required: true, nullable: false }),
    modifierTags: new fields.StringField({ required: true, nullable: false }),
    extraAttacks: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    consumeAction: new fields.BooleanField({ required: true, nullable: false, initial: true }),

    // Added: Missing?
    rate_of_fire: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }
}

type RangedAttackComponentSchema = ItemComponentSchema & ReturnType<typeof rangedAttackComponentSchema>

/* ---------------------------------------- */

class RangedAttackComponent extends ItemComponent<RangedAttackComponentSchema> {
  declare name: string
  declare otf: string
  declare import: number
  declare range: string
  static override defineSchema(): RangedAttackComponentSchema {
    return {
      ...super.defineSchema(),
      ...rangedAttackComponentSchema(),
    }
  }

  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */

  level: number = 0
}

/* ---------------------------------------- */

export { RangedAttackModel, type RangedAttackSchema, RangedAttackComponent, type RangedAttackComponentSchema }
