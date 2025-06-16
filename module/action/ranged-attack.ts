import fields = foundry.data.fields
import { AnyObject } from 'fvtt-types/utils'

import { BaseAction, BaseActionSchema } from './base.js'
import { ItemComponent, ItemComponentSchema } from '../item/data/component.js'
import { makeRegexPatternFrom } from '../../lib/utilities.js'
import * as Settings from '../../lib/miscellaneous-settings.js'

class RangedAttack extends BaseAction<RangedAttackSchema> {
  static override defineSchema(): RangedAttackSchema {
    return {
      ...super.defineSchema(),
      ...rangedAttackSchema(),
    }
  }

  /* ---------------------------------------- */

  get component(): RangedAttackComponent {
    return this.rng
  }
  /* ---------------------------------------- */

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareBaseData(): void {
    super.prepareBaseData()
    this.component.level = this.component.import
  }

  /* ---------------------------------------- */

  convertRanges(st: number): void {
    if (game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_CONVERT_RANGED) === false) return

    let range = this.component.range
    // Match the range format, e.g., "x2", "x20", "x30"
    const matchSingle = range.match(/^\s*[xX]([\d\.]+)\s*$/)
    const matchMultiple = range.match(/^\s*[xX]([\d\.]+)\s*-\s*[xX]([\d\.]+)\s*$/)
    if (matchSingle) {
      this.component.range = `${parseFloat(matchSingle[1]) * st}`
    } else if (matchMultiple) {
      const newRangeStart = parseFloat(matchMultiple[1]) * st
      const newRangeEnd = parseFloat(matchMultiple[2]) * st
      this.component.range = `${newRangeStart} - ${newRangeEnd}`
    }
  }

  /* ---------------------------------------- */

  applyBonuses(bonuses: AnyObject[]): void {
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

const rangedAttackComponentSchema = {
  // NOTE: change from previous schema where this was a string
  import: new fields.NumberField({ required: true, nullable: false }),
  // NOTE: no longer persistent data, always derived from import value
  // level: new fields.NumberField({ required: true, nullable: false }),
  damage: new fields.StringField({ required: true, nullable: false }),
  st: new fields.StringField({ required: true, nullable: false }),
  mode: new fields.StringField({ required: true, nullable: false }),
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
  modifierTags: new fields.StringField({ required: true, nullable: false }),
  extraAttacks: new fields.NumberField({ required: true, nullable: false }),
  consumeAction: new fields.BooleanField({ required: true, nullable: false, initial: true }),
}

type RangedAttackComponentSchema = ItemComponentSchema & typeof rangedAttackComponentSchema

/* ---------------------------------------- */

class RangedAttackComponent extends ItemComponent<RangedAttackComponentSchema> {
  static override defineSchema(): RangedAttackComponentSchema {
    return {
      ...super.defineSchema(),
      ...rangedAttackComponentSchema,
    }
  }

  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */

  level: number = 0
}

/* ---------------------------------------- */

export { RangedAttack, type RangedAttackSchema }
