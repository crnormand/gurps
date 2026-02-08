
import { parselink } from '@util/parselink.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

import { ItemComponent, ItemComponentSchema } from '../item/data/component.js'
import { fields } from '../types/foundry/index.js'

import { BaseAction, BaseActionSchema } from './base-action.js'

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
  }

  /* ---------------------------------------- */

  override prepareDerivedData(): void {
    super.prepareDerivedData()
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
      console.warn(`GURPS | MeleeAttackModel: OTF "${otf}" did not return a valid action.`)

      return
    }

    action.action.calcOnly = true
    // TODO: verify that target is of type "number" (or replace this whole thing)
    GURPS.performAction(action.action, this.actor).then(
      (result: boolean | { target: number; thing: any } | undefined) => {
        if (result && typeof result === 'object') {
          this.component.level = result.target
        }

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
    )
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

type MeleeAttackSchema = BaseActionSchema & ReturnType<typeof meleeAttackSchema>

/* ---------------------------------------- */

const meleeAttackComponentSchema = () => {
  return {
    // NOTE: change from previous schema where this was a string
    import: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    // NOTE: no longer persistent data, always derived from import value
    // level: new fields.NumberField({ required: true, nullable: false }),
    damage: new fields.StringField({ required: true, nullable: false }),
    st: new fields.StringField({ required: true, nullable: false }),
    mode: new fields.StringField({ required: true, nullable: false }),
    notes: new fields.StringField({ required: true, nullable: false }),
    weight: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    techlevel: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    cost: new fields.StringField({ required: true, nullable: false }),
    reach: new fields.StringField({ required: true, nullable: false }),
    parry: new fields.StringField({ required: true, nullable: false }),
    parrybonus: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    baseParryPenalty: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    block: new fields.StringField({ required: true, nullable: false }),
    blockbonus: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    otf: new fields.StringField({ required: true, nullable: false }),
    itemModifiers: new fields.StringField({ required: true, nullable: false }),
    modifierTags: new fields.StringField({ required: true, nullable: false }),
    extraAttacks: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    consumeAction: new fields.BooleanField({ required: true, nullable: false, initial: true }),
  }
}

type MeleeAttackComponentSchema = ItemComponentSchema & ReturnType<typeof meleeAttackComponentSchema>

/* ---------------------------------------- */

class MeleeAttackComponent extends ItemComponent<MeleeAttackComponentSchema> {
  declare name: string
  declare otf: string
  declare import: number
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

  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */

  level: number = 0
}

/* ---------------------------------------- */

export { MeleeAttackModel, type MeleeAttackSchema, MeleeAttackComponent, type MeleeAttackComponentSchema }
