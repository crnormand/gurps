import { fields } from '@gurps-types/foundry/index.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

import { BaseAttack } from './base-attack.js'
import { ActionType } from './types.js'

class MeleeAttackModel extends BaseAttack<MeleeAttackSchema> {
  static override defineSchema(): MeleeAttackSchema {
    return Object.assign(super.defineSchema(), meleeAttackSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): string {
    return ActionType.MeleeAttack
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareDerivedData(): void {
    super.prepareDerivedData()
    this.#prepareDefenses()
  }

  /* ---------------------------------------- */

  #prepareDefenses(): void {
    // Do not prepare defenses if the item is not owned
    if (!this.item.isOwned) return

    // If parry is a number, its value will be re-calculated using the parry
    // bonus and the current level.
    // NOTE: Change from previous method where parry itself could store a
    // value with a leading [+-] to indicate a bonus.
    if (!isNaN(parseInt(this.parry))) {
      const parryLevel = parseInt(this.parry)
      const parrySuffix = this.parry.replace(parryLevel.toString(), '').trim()

      this.parry = `${3 + Math.floor(this.level / 2) + this.parrybonus}${parrySuffix}`
    }

    // If block is a number, its value will be re-calculated using the block
    // bonus and the current level.
    // NOTE: Change from previous method where block itself could store a
    // value with a leading [+-] to indicate a bonus.
    if (!isNaN(parseInt(this.block))) {
      const blockLevel = parseInt(this.block)
      const blockSuffix = this.block.replace(blockLevel.toString(), '').trim()

      this.block = `${3 + Math.floor(this.level / 2) + this.blockbonus}${blockSuffix}`
    }
  }

  /* ---------------------------------------- */

  override applyBonuses(bonuses: AnyObject[]): void {
    for (const bonus of bonuses) {
      // All melee attacks are affected by DX
      if (bonus.type === 'attribute' && bonus.attrkey === 'DX') {
        this.level += bonus.mod as number

        // Add to parry if it is a number
        if (!isNaN(parseInt(this.parry))) {
          // Handle parry with a suffix such as "F"
          const parryLevel = parseInt(this.parry)
          const parrySuffix = this.parry.replace(parryLevel.toString(), '').trim()

          this.parry = `${3 + Math.floor(this.level / 2)}${parrySuffix}`
        }

        if (!isNaN(parseInt(this.block))) {
          this.block = `${3 + Math.floor(this.level / 2)}`
        }
      }

      if (bonus.type === 'attack' && bonus.isMelee) {
        if (this.name && this.name.match(makeRegexPatternFrom(bonus.name as string, false))) {
          this.level += bonus.mod as number

          // Handle parry with a suffix such as "F"
          if (!isNaN(parseInt(this.parry))) {
            const parryLevel = parseInt(this.parry)
            const parrySuffix = this.parry.replace(parryLevel.toString(), '').trim()

            this.parry = `${3 + Math.floor(this.level / 2)}${parrySuffix}`
          }

          if (!isNaN(parseInt(this.block))) {
            this.block = `${3 + Math.floor(this.level / 2)}`
          }
        }
      }
    }
  }
}

/* ---------------------------------------- */

const meleeAttackSchema = () => {
  return {
    /** The reach of this attack, e.g. "C", "C,1", "1,2", etc. */
    reach: new fields.StringField({ required: true, nullable: false }),

    /** The parry value of this attack, e.g. "3", "3F",  etc. */
    parry: new fields.StringField({ required: true, nullable: false }),

    /** The parry bonus of this attack, which is added to the base parry value to determine the final parry value. */
    parrybonus: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The parry penalty of this attack, which is added to the base parry value to determine the final parry value. */
    baseParryPenalty: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The block value of this attack, e.g. "3",  etc. */
    block: new fields.StringField({ required: true, nullable: false }),

    /** The block bonus of this attack, which is added to the base block value to determine the final block value. */
    blockbonus: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /**
     * NOTE: These fields seem inappropriate for attacks and appear to be vestigial. They have been commented out but
     * left here temporarily for documentation purposes.
     */

    // weight: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    // techlevel: new fields.StringField({ required: true, nullable: false, initial: '' }),
    // cost: new fields.StringField({ required: true, nullable: false }),
  }
}

type MeleeAttackSchema = BaseAttack.Schema & ReturnType<typeof meleeAttackSchema>

/* ---------------------------------------- */

export { MeleeAttackModel, type MeleeAttackSchema }
