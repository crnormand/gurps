import { fields } from '@gurps-types/foundry/index.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

import { BaseAction } from './base-action.js'
import { BaseAttackComponent, BaseAttackComponentSchema } from './component.ts'

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

type RangedAttackSchema = BaseAction.Schema & ReturnType<typeof rangedAttackSchema>

/* ---------------------------------------- */

const rangedAttackComponentSchema = () => {
  return {
    bulk: new fields.StringField({ required: true, nullable: false }),
    legalityclass: new fields.StringField({ required: true, nullable: false }),
    ammo: new fields.StringField({ required: true, nullable: false }),
    acc: new fields.StringField({ required: true, nullable: false }),
    range: new fields.StringField({ required: true, nullable: false }),
    shots: new fields.StringField({ required: true, nullable: false }),
    rcl: new fields.StringField({ required: true, nullable: false }),
    halfd: new fields.StringField({ required: true, nullable: false }),
    max: new fields.StringField({ required: true, nullable: false }),
    rate_of_fire: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }
}

type RangedAttackComponentSchema = BaseAttackComponentSchema & ReturnType<typeof rangedAttackComponentSchema>

/* ---------------------------------------- */

class RangedAttackComponent extends BaseAttackComponent<RangedAttackComponentSchema> {
  declare range: string
  static override defineSchema(): RangedAttackComponentSchema {
    return {
      ...super.defineSchema(),
      ...rangedAttackComponentSchema(),
    }
  }
}

/* ---------------------------------------- */

export { RangedAttackModel, type RangedAttackSchema, RangedAttackComponent, type RangedAttackComponentSchema }
