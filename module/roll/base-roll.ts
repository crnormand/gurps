import { AnyObject } from 'fvtt-types/utils'

namespace GurpsBaseRoll {
  export type RollModifier = {
    comment: string
    value: number
  }

  /* ---------------------------------------- */

  export type Data = {
    modifiers?: RollModifier[]
  }

  /* ---------------------------------------- */

  export interface Options extends Roll.Options {
    flavor?: string
  }
}

/* ---------------------------------------- */

class GurpsBaseRoll<D extends GurpsBaseRoll.Data = GurpsBaseRoll.Data> extends Roll<D> {
  constructor(formula: string, data?: D, options?: GurpsBaseRoll.Options) {
    super(formula, data, options)
  }

  /* ---------------------------------------- */

  get modifierTotal(): number {
    return this.data.modifiers?.reduce((total, mod) => total + mod.value, 0) ?? 0
  }

  /**
   * Prepare context data used to render the CHAT_TEMPLATE for this roll.
   * @param {object} options
   * @param {string} [options.flavor]
   * @param {boolean} [options.isPrivate=false]
   * @returns {Promise<{object}>}
   * @protected
   */
  // @ts-expect-error: Waiting for types to catch up
  protected override async _prepareChatRenderContext({
    flavor,
    isPrivate = false,
    ...options
  }: { flavor?: string; isPrivate?: boolean } & AnyObject = {}): Promise<AnyObject> {
    return {
      formula: isPrivate ? '???' : this._formula,
      flavor: isPrivate ? null : (flavor ?? this.options.flavor),
      user: game.user?.id,
      tooltip: isPrivate ? '' : await this.getTooltip(),
      total: isPrivate ? '?' : Math.round((this.total ?? 0) * 100) / 100,
    }
  }
}

/* ---------------------------------------- */

interface GurpsBaseRoll<D extends GurpsBaseRoll.Data> extends Roll<D> {
  options: GurpsBaseRoll.Options
}

export { GurpsBaseRoll }
