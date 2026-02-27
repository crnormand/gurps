import { fields } from '@gurps-types/foundry/index.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

import { BaseAttack } from './base-attack.js'
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
        ;(source.parry as AnyMutableObject).fencing = false
        ;(source.parry as AnyMutableObject).unbalanced = false
        ;(source.parry as AnyMutableObject).modifier = 0
      }
    }

    return source
  }

  /* ---------------------------------------- */

  static override get TYPE(): string {
    return ActionType.MeleeAttack
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES: string[] = ['GURPS.Action.MeleeAttack']

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareBaseData(): void {
    super.prepareBaseData()
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
      : (game.i18n?.localize('GURPS.Action.MeleeAttack.parryDisabled') ?? '')

    this.blockText = this.block.canBlock
      ? `${this.blockLevel}`
      : (game.i18n?.localize('GURPS.Action.MeleeAttack.blockDisabled') ?? '')

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
}

/* ---------------------------------------- */

const meleeAttackSchema = () => {
  return {
    /** The reach of this attack */
    reach: new fields.SchemaField({
      /** The minimum reach of this attack, in yards. */
      min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** The maximum reach of this attack, in yards. */
      max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** Can this attack be made in close combat (i.e. against an adjacent target)? */
      closeCombat: new fields.BooleanField({ required: true, nullable: false, initial: true }),
      /** Does this attack require a ready maneuver to change range? */
      changeRequiresReady: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    }),

    /** The parry value of this attack */
    parry: new fields.SchemaField({
      /** Can this attack parry at all? */
      canParry: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      /** Is this weapon treated as a fencing weapon for parry purposes? */
      fencing: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      /** Is this weapon unbalanced for parry purposes?  */
      unbalanced: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      /** What is the parry modifier for this attack, which is added to the base parry value to determine the final parry value. */
      modifier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }),

    /** The block value of this attack */
    block: new fields.SchemaField({
      /** Can this attack block at all? */
      canBlock: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      /** The block modifier for this attack, which is added to the base block value to determine the final block value. */
      modifier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }),

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
