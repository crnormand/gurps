import { AnyObject } from 'fvtt-types/utils'
import { GurpsBaseRoll } from './base-roll.js'

/* ---------------------------------------- */

namespace SuccessRoll {
  export type Data = GurpsBaseRoll.Data & {
    target: number
    actorId?: string | null
    itemId?: string | null
  }

  /* ---------------------------------------- */

  export interface MessageData extends Roll.MessageData {}
}

/* ---------------------------------------- */

class SuccessRoll extends GurpsBaseRoll<SuccessRoll.Data> {
  /**
   * In principle the formula for a success roll is always 3d6,
   * but in the interest of not changing the constructor signature
   * we're going to leave this undefined here
   * I may change this in the future.
   * - MT
   */
  constructor(formula: string, data?: SuccessRoll.Data, options?: Roll.Options) {
    super(formula, data, options)
  }

  /* ---------------------------------------- */
  /*  Accessors                               */
  /* ---------------------------------------- */

  get item(): Item.Implementation | null {
    if (!this.data.itemId) return null

    if (this.data.actorId) {
      const actor = game.actors?.get(this.data.actorId)
      if (!actor) return null

      const item = actor.items.get(this.data.itemId)
      if (!item) return null

      return item
    } else {
      const item = game.items?.get(this.data.itemId)
      if (!item) return null

      return item
    }
  }

  /* ---------------------------------------- */

  get effectiveTarget(): number {
    let effectiveTarget = this.data.target || 0
    return (effectiveTarget += this.modifierTotal)
  }

  /* ---------------------------------------- */

  get outcome(): 'success' | 'failure' | 'criticalSuccess' | 'criticalFailure' | null {
    if (!this._evaluated) return null
    if (this.isCriticalSuccess) return 'criticalSuccess'
    if (this.isCriticalFailure) return 'criticalFailure'
    if (this.isSuccess) return 'success'
    if (this.isFailure) return 'failure'
    return null
  }

  /* ---------------------------------------- */

  get isCriticalSuccess(): boolean | null {
    if (!this._evaluated) return null
    const total = this.dice[0].total!
    switch (true) {
      case this.effectiveTarget > 16:
        return total <= 6
      case this.effectiveTarget > 15:
        return total <= 5
      default:
        return total <= 4
    }
  }

  /* ---------------------------------------- */

  get isSuccess(): boolean | null {
    if (!this._evaluated) return null
    if (!this.isCriticalFailure) return false
    return this.isCriticalSuccess || this.dice[0].total! <= this.effectiveTarget
  }

  /* ---------------------------------------- */

  get isCriticalFailure(): boolean | null {
    if (!this._evaluated) return null
    const total = this.dice[0].total!
    if (total === 18) return true
    if (total === 17 && this.effectiveTarget <= 15) return true
    if (total - 10 >= this.effectiveTarget) return true
    return false
  }

  /* ---------------------------------------- */

  get isFailure(): boolean | null {
    if (!this._evaluated) return null
    return !this.isSuccess
  }

  /* ---------------------------------------- */
  /*  Message Processing                      */
  /* ---------------------------------------- */

  static override CHAT_TEMPLATE = `systems/gurps/templates/roll/success-roll.hbs`
  static override TOOLTIP_TEMPLATE = `systems/gurps/templates/roll/success-roll-tooltip.hbs`

  /* ---------------------------------------- */

  protected override async _prepareChatRenderContext({
    flavor,
    isPrivate = false,
    ...options
  }: { flavor?: string; isPrivate?: boolean } & AnyObject = {}): Promise<AnyObject> {
    const context = await super._prepareChatRenderContext({ flavor, isPrivate, ...options })

    const modifiers = this.data.modifiers
    const name = this.item?.name ?? ''
    const outcome = this.outcome

    Object.assign(context, { name, modifiers, outcome })
    // console.log(context)
    return context
  }
}

/* ---------------------------------------- */

export { SuccessRoll }
