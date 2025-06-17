import fields = foundry.data.fields
import { AnyObject } from 'fvtt-types/utils'

import { BaseAction, BaseActionSchema } from './base-action.js'
import { ItemComponent, ItemComponentSchema } from '../item/data/component.js'
import { makeRegexPatternFrom } from '../../lib/utilities.js'

class MeleeAttack extends BaseAction<MeleeAttackSchema> {
  static override defineSchema(): MeleeAttackSchema {
    return {
      ...super.defineSchema(),
      ...meleeAttackSchema(),
    }
  }

  /* ---------------------------------------- */

  get component(): MeleeAttackComponent {
    return this.mel
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareBaseData(): void {
    super.prepareBaseData()
    this.component.level = this.component.import
  }

  /* ---------------------------------------- */

  applyBonuses(bonuses: AnyObject[]): void {
    for (const bonus of bonuses) {
      // All melee attacks are affected by DX
      if (bonus.type === 'attribute' && bonus.attrkey === 'DX') {
        this.component.level += bonus.mod as number

        // Add to parry if it is a number
        if (!isNaN(parseInt(this.component.parry))) {
          // Handle parry with a suffix such as "F"
          const parryLevel = parseInt(this.component.parry)
          const parrySuffix = this.component.parry.replace(parryLevel.toString(), '').trim()

          this.component.parry = `${3 + Math.floor(this.component.level / 2)}${parrySuffix}`
        }

        if (!isNaN(parseInt(this.component.block))) {
          this.component.block = `${3 + Math.floor(this.component.level / 2)}`
        }
      }

      if (bonus.type === 'attack' && bonus.isMelee) {
        if (this.component.name.match(makeRegexPatternFrom(bonus.name as string, false))) {
          this.component.level += bonus.mod as number
          // Handle parry with a suffix such as "F"
          if (!isNaN(parseInt(this.component.parry))) {
            const parryLevel = parseInt(this.component.parry)
            const parrySuffix = this.component.parry.replace(parryLevel.toString(), '').trim()
            this.component.parry = `${3 + Math.floor(this.component.level / 2)}${parrySuffix}`
          }
          if (!isNaN(parseInt(this.component.block))) {
            this.component.block = `${3 + Math.floor(this.component.level / 2)}`
          }
        }
      }
    }
  }
}

/* ---------------------------------------- */

const meleeAttackSchema = () => {
  return {
    mel: new fields.EmbeddedDataField(MeleeAttackComponent, { required: true, nullable: false }),
  }
}

type MeleeAttackSchema = BaseActionSchema & ReturnType<typeof meleeAttackSchema>

/* ---------------------------------------- */

const meleeAttackComponentSchema = {
  // NOTE: change from previous schema where this was a string
  import: new fields.NumberField({ required: true, nullable: false }),
  // NOTE: no longer persistent data, always derived from import value
  // level: new fields.NumberField({ required: true, nullable: false }),
  damage: new fields.StringField({ required: true, nullable: false }),
  st: new fields.StringField({ required: true, nullable: false }),
  mode: new fields.StringField({ required: true, nullable: false }),
  weight: new fields.NumberField({ required: true, nullable: false }),
  techlevel: new fields.NumberField({ required: true, nullable: false }),
  cast: new fields.StringField({ required: true, nullable: false }),
  reach: new fields.StringField({ required: true, nullable: false }),
  parry: new fields.StringField({ required: true, nullable: false }),
  baseParryPenalty: new fields.NumberField({ required: true, nullable: false }),
  block: new fields.StringField({ required: true, nullable: false }),
  otf: new fields.StringField({ required: true, nullable: false }),
  modifierTags: new fields.StringField({ required: true, nullable: false }),
  extraAttacks: new fields.NumberField({ required: true, nullable: false }),
  consumeAction: new fields.BooleanField({ required: true, nullable: false, initial: true }),
}

type MeleeAttackComponentSchema = ItemComponentSchema & typeof meleeAttackComponentSchema

/* ---------------------------------------- */

class MeleeAttackComponent extends ItemComponent<MeleeAttackComponentSchema> {
  static override defineSchema(): MeleeAttackComponentSchema {
    return {
      ...super.defineSchema(),
      ...meleeAttackComponentSchema,
    }
  }

  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */

  level: number = 0
}

/* ---------------------------------------- */

export { MeleeAttack, type MeleeAttackSchema }
