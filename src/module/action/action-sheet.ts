import { GenericPseudoSheet } from '@module/pseudo-document/generic-pseudo-sheet.js'

import { Action } from './index.js'

/* ---------------------------------------- */

namespace ActionSheet {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface RenderOptions extends GenericPseudoSheet.RenderOptions {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Configuration extends GenericPseudoSheet.Configuration<Action.Any> {}

  /* ---------------------------------------- */

  export type DefaultOptions = GenericPseudoSheet.DefaultOptions

  /* ---------------------------------------- */

  export interface RenderContext extends GenericPseudoSheet.RenderContext<Action.Any> {
    action: Action.Any | null
  }
}

/* ---------------------------------------- */

class ActionSheet extends GenericPseudoSheet<Action.Any> {
  /* ---------------------------------------- */
  /*  Context Preparation                     */
  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: GenericPseudoSheet.RenderOptions
  ): Promise<ActionSheet.RenderContext> {
    const superContext = await super._prepareContext(options)

    return foundry.utils.mergeObject(superContext, {
      action: this.pseudoDocument,
    })
  }
}

export { ActionSheet }
