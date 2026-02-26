import { fields } from '@gurps-types/foundry/index.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

import { BaseAttack } from './base-attack.ts'

class RangedAttackModel extends BaseAttack<RangedAttackSchema> {
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

    const range = this.range
    // Match the range format, e.g., "x2", "x20", "x30"
    const matchSingle = range.match(/^\s*[×xX]([\d.]+)\s*$/)
    const matchMultiple = range.match(/^\s*[×xX]([\d.]+)\s*-\s*[×xX]([\d.]+)\s*$/)

    if (matchSingle) {
      this.range = `${parseFloat(matchSingle[1]) * st}`
    } else if (matchMultiple) {
      const newRangeStart = parseFloat(matchMultiple[1]) * st
      const newRangeEnd = parseFloat(matchMultiple[2]) * st

      this.range = `${newRangeStart} - ${newRangeEnd}`
    }
  }

  /* ---------------------------------------- */

  override applyBonuses(bonuses: AnyObject[]): void {
    for (const bonus of bonuses) {
      // All melee attacks are affected by DX
      if (bonus.type === 'attribute' && bonus.attrkey === 'DX') {
        this.level += bonus.mod as number
      }

      if (bonus.type === 'attack' && bonus.isRanged) {
        if (this.name && this.name.match(makeRegexPatternFrom(bonus.name as string, false))) {
          this.level += bonus.mod as number
        }
      }
    }
  }
}

/* ---------------------------------------- */

const rangedAttackSchema = () => {
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
    rateOfFire: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }
}

type RangedAttackSchema = BaseAttack.Schema & ReturnType<typeof rangedAttackSchema>

/* ---------------------------------------- */

export { RangedAttackModel, type RangedAttackSchema }
