import { HandlebarsApplicationMixin } from '@gurps-types/foundry/index.js'
import { bindInlineEdit } from '@module/actor/sheets/modern/inline-edit-handler.js'
import { PseudoDocumentSheet } from '@module/pseudo-document/pseudo-document-sheet.js'
import { syncLabelWidths } from '@module/util/dom.js'
import { systemPath } from '@module/util/misc.js'

import { Action } from './index.js'

/* ---------------------------------------- */

namespace ActionSheet {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Configuration extends PseudoDocumentSheet.Configuration<Action.Any> {}

  /* ---------------------------------------- */

  export type DefaultOptions = PseudoDocumentSheet.DefaultOptions

  /* ---------------------------------------- */

  export interface RenderContext extends PseudoDocumentSheet.RenderContext<Action.Any> {
    action: Action.Any | null
  }
}

/* ---------------------------------------- */

class ActionSheet extends PseudoDocumentSheet<Action.Any> {
  static override DEFAULT_OPTIONS: PseudoDocumentSheet.DefaultOptions = {
    classes: ['action-sheet', 'modern-item-sheet'],
    window: {
      resizable: true,
    },
    position: {
      width: 600,
      height: 600,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    header: {
      template: systemPath('templates/action/header.hbs'),
    },
    details: {
      template: systemPath('templates/action/details.hbs'),
      scrollable: [''],
    },
  }

  /* ---------------------------------------- */
  /*  Context Preparation                     */
  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: PseudoDocumentSheet.RenderOptions
  ): Promise<ActionSheet.RenderContext> {
    const superContext = await super._prepareContext(options)

    return foundry.utils.mergeObject(superContext, {
      action: this.pseudoDocument,
    })
  }

  /* ---------------------------------------- */
  /*  Non-Action Bindings                     */
  /* ---------------------------------------- */

  protected override async _onRender(
    context: ActionSheet.RenderContext,
    options: PseudoDocumentSheet.RenderOptions
  ): Promise<void> {
    super._onRender(context, options)
    syncLabelWidths(this.element)

    bindInlineEdit(this.element, {
      displaySelector: '.ms-name-display',
      containerSelector: '.ms-name-container',
      inputSelector: 'input[name="name"]',
      fieldType: 'name',
    })
  }
}

export { ActionSheet }
