import { fields } from '@gurps-types/foundry/index.js'
import { DisplayMeleeAttack } from '@gurps-types/gurps/display-item.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

import { BaseAttack } from './base-attack.js'
import { WeaponBlockField, WeaponParryField, WeaponReachField } from './fields.js'
import { ActionType } from './types.js'

class MeleeAttackModel extends BaseAttack<MeleeAttackSchema> {
  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */
  parryLevel: number = 0
  parryText: string = ''
  blockLevel: number = 0
  blockText: string = ''
  reachText: string = ''

  /* ---------------------------------------- */

  static override defineSchema(): MeleeAttackSchema {
    return Object.assign(super.defineSchema(), meleeAttackSchema())
  }

  /* ---------------------------------------- */

  static override cleanData(source?: AnyMutableObject, options?: fields.DataField.CleanOptions): AnyMutableObject {
    source = super.cleanData(source, options)

    // Clean the parry field to ensure it is normalized.
    // If parrying is disabled, the other parry fields are also reset to their default values.
    if ('parry' in source && typeof source.parry === 'object' && source.parry !== null) {
      if ('canParry' in source.parry && typeof source.parry.canParry === 'boolean' && !source.parry.canParry) {
        const parry = source.parry as AnyMutableObject

        parry.fencing = false
        parry.unbalanced = false
        parry.modifier = 0

        source.parry = parry
      }
    }

    // Clean the block field to ensure it is normalized.
    // If blocking is disabled, the other block fields are also reset to their default values.
    if ('block' in source && typeof source.block === 'object' && source.block !== null) {
      if ('canBlock' in source.block && typeof source.block.canBlock === 'boolean' && !source.block.canBlock) {
        const block = source.block as AnyMutableObject

        block.modifier = 0

        source.block = block
      }
    }

    // Normalize the reach value to ensure min cannot be bigger than max and only valid reach values
    // can pass through for each.
    if ('reach' in source && typeof source.reach === 'object' && source.reach !== null) {
      if (
        'min' in source.reach &&
        typeof source.reach.min === 'number' &&
        'max' in source.reach &&
        typeof source.reach.max === 'number'
      ) {
        source.reach.min = Math.max(source.reach.min, 0)
        source.reach.max = Math.max(source.reach.max, 0)

        if (source.reach.min === 0 && source.reach.max !== 0) {
          source.reach.min = 1
        } else if (source.reach.min !== 0 && source.reach.max === 0) {
          source.reach.max = source.reach.min
        }

        source.reach.max = Math.max(Number(source.reach.min), Number(source.reach.max))
      }
    }

    return source
  }

  /* ---------------------------------------- */

  static override get TYPE(): string {
    return ActionType.MeleeAttack
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES: string[] = ['GURPS.action.meleeAttack']

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareDerivedData(): void {
    super.prepareDerivedData()
    this.#prepareDefenses()
    this.#prepareDisplayValues()
  }

  /* ---------------------------------------- */

  #prepareDefenses(): void {
    // Do not prepare defenses if the item is not owned
    if (!this.item.isOwned) return

    this.parryLevel = this.parry.canParry ? Math.floor(this.level / 2) + 3 + this.parry.modifier : 0

    this.blockLevel = this.block.canBlock ? Math.floor(this.level / 2) + 3 + this.block.modifier : 0
  }

  /* ---------------------------------------- */

  #prepareDisplayValues(): void {
    this.parryText = this.parry.canParry
      ? `${this.parryLevel}${this.parry.fencing ? 'F' : ''}${this.parry.unbalanced ? 'U' : ''}`
      : (game.i18n?.localize('GURPS.action.meleeAttack.parryDisabled') ?? '')

    this.blockText = this.block.canBlock
      ? `${this.blockLevel}`
      : (game.i18n?.localize('GURPS.action.meleeAttack.blockDisabled') ?? '')

    // Prepare reach value
    let reach = ''

    if (this.reach.closeCombat) reach += 'C'

    if (this.reach.min !== 0 || this.reach.max !== 0) {
      if (reach.length > 0) reach += ','
      reach += this.reach.min.toString()

      if (this.reach.max !== this.reach.min) {
        reach += `-${this.reach.max}`
      }
    }

    if (this.reach.changeRequiresReady) reach += '*'
    this.reachText = reach
  }

  /* ---------------------------------------- */

  override applyBonuses(bonuses: AnyObject[]): void {
    for (const bonus of bonuses) {
      // All melee attacks are affected by DX
      if (bonus.type === 'attribute' && bonus.attrkey === 'DX') {
        this.level += bonus.mod as number

        // Recalculate parry and block levels after applying the bonus to the attack level
        this.#prepareDefenses()
        this.#prepareDisplayValues()
      }

      if (bonus.type === 'attack' && bonus.isMelee) {
        if (this.name && this.name.match(makeRegexPatternFrom(bonus.name as string, false))) {
          this.level += bonus.mod as number

          // Recalculate parry and block levels after applying the bonus to the attack level
          this.#prepareDefenses()
          this.#prepareDisplayValues()
        }
      }
    }
  }

  /* ---------------------------------------- */

  override toDisplayItem(): DisplayMeleeAttack {
    const fullName = super.toDisplayItem().fullName

    const block = this.block.canBlock ? `B:"${fullName}` + (this.mode ? ` (${this.mode})"` : `"`) : null

    const parry = this.parry.canParry ? `P:"${fullName}` + (this.mode ? ` (${this.mode})"` : `"`) : null

    return foundry.utils.mergeObject(super.toDisplayItem(), {
      reach: this.reachText,
      parry: this.parryText,
      block: this.blockText,
      otf: {
        level: `M:"${fullName}` + (this.mode ? ` (${this.mode})"` : `"`),
        damage: `D:"${fullName}` + (this.mode ? ` (${this.mode})"` : `"`),
        block,
        parry,
      },
    })
  }
}

/* ---------------------------------------- */

const meleeAttackSchema = () => {
  return {
    /** The reach of this attack */
    reach: new WeaponReachField(),

    /** The parry value of this attack */
    parry: new WeaponParryField(),

    /** The penalty to this attack's parry level for multiple parries in a given turn. */
    baseParryPenalty: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

    /** The block value of this attack */
    block: new WeaponBlockField(),
  }
}

type MeleeAttackSchema = BaseAttack.Schema & ReturnType<typeof meleeAttackSchema>

/* ---------------------------------------- */

export { MeleeAttackModel, type MeleeAttackSchema }
