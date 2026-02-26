import { fields } from '@gurps-types/foundry/index.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

import { BaseAction } from './base-action.js'
import { BaseAttackComponent, BaseAttackComponentSchema } from './component.ts'

// TODO There is significant overlap between Melee and Ranged attacks; consider a shared base class.
class MeleeAttackModel extends BaseAction<MeleeAttackSchema> {
  declare mel: MeleeAttackComponent
  static override defineSchema(): MeleeAttackSchema {
    return Object.assign(super.defineSchema(), meleeAttackSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): string {
    return 'meleeAttack'
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
    if (!isNaN(parseInt(this.component.parry))) {
      const parryLevel = parseInt(this.component.parry)
      const parrySuffix = this.component.parry.replace(parryLevel.toString(), '').trim()

      this.component.parry = `${3 + Math.floor(this.component.level / 2) + this.component.parrybonus}${parrySuffix}`
    }

    // If block is a number, its value will be re-calculated using the block
    // bonus and the current level.
    // NOTE: Change from previous method where block itself could store a
    // value with a leading [+-] to indicate a bonus.
    if (!isNaN(parseInt(this.component.block))) {
      const blockLevel = parseInt(this.component.block)
      const blockSuffix = this.component.block.replace(blockLevel.toString(), '').trim()

      this.component.block = `${3 + Math.floor(this.component.level / 2) + this.component.blockbonus}${blockSuffix}`
    }
  }

  /* ---------------------------------------- */

  override applyBonuses(bonuses: AnyObject[]): void {
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

type MeleeAttackSchema = BaseAction.Schema & ReturnType<typeof meleeAttackSchema>

/* ---------------------------------------- */

const meleeAttackComponentSchema = () => {
  return {
    weight: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    techlevel: new fields.StringField({ required: true, nullable: false, initial: '' }),
    cost: new fields.StringField({ required: true, nullable: false }),
    reach: new fields.StringField({ required: true, nullable: false }),
    parry: new fields.StringField({ required: true, nullable: false }),
    parrybonus: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    baseParryPenalty: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    block: new fields.StringField({ required: true, nullable: false }),
    blockbonus: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

type MeleeAttackComponentSchema = BaseAttackComponentSchema & ReturnType<typeof meleeAttackComponentSchema>

/* ---------------------------------------- */

class MeleeAttackComponent extends BaseAttackComponent<MeleeAttackComponentSchema> {
  declare parry: string
  declare parrybonus: number
  declare block: string
  declare blockbonus: number
  static override defineSchema(): MeleeAttackComponentSchema {
    return {
      ...super.defineSchema(),
      ...meleeAttackComponentSchema(),
    }
  }
}

/* ---------------------------------------- */

export { MeleeAttackModel, type MeleeAttackSchema, MeleeAttackComponent, type MeleeAttackComponentSchema }
