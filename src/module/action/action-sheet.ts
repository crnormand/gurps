import { DeepPartial, HandlebarsApplicationMixin } from '@gurps-types/foundry/index.js'
import { bindInlineEdit } from '@module/actor/sheets/modern/inline-edit-handler.js'
import { PseudoDocumentSheet } from '@module/pseudo-document/pseudo-document-sheet.js'
import { syncLabelWidths } from '@module/util/dom.js'
import { systemPath } from '@module/util/misc.js'

import { Action, ActionType } from './index.js'

/* ---------------------------------------- */

namespace ActionSheet {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface RenderOptions extends PseudoDocumentSheet.RenderOptions {}

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
    classes: ['action-sheet'],
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

  override get title(): string {
    return this.pseudoDocument?.name ?? _loc('DOCUMENT.' + this.pseudoDocument?.documentName)
  }

  /* ---------------------------------------- */

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

  protected _getTypeContext(): { class: string; icon: string } {
    switch (this.pseudoDocument?.type) {
      case ActionType.MeleeAttack:
        return { class: 'ms-type-melee-attack', icon: 'fa-solid fa-sword' }
      case ActionType.RangedAttack:
        return { class: 'ms-type-ranged-attack', icon: 'fa-solid fa-gun' }
      default:
        return { class: '', icon: 'fa-solid fa-ban' }
    }
  }

  /* ---------------------------------------- */

  protected override async _renderFrame(options: DeepPartial<ActionSheet.RenderOptions>): Promise<HTMLElement> {
    const frame = await super._renderFrame(options)

    const titleElement = this.window.header?.querySelector('h1')

    const typeContext = this._getTypeContext()

    if (titleElement) {
      const iconHtml = document.createElement('i')

      iconHtml.classList.add(...typeContext.icon.split(' '))

      this.window.header?.insertBefore(iconHtml, titleElement)
    }

    return frame
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

    const typeContext = this._getTypeContext()

    this.element.classList.add(typeContext.class)

    bindInlineEdit(this.element, {
      displaySelector: '.ms-name-display',
      containerSelector: '.ms-name-container',
      inputSelector: 'input[name="name"]',
      fieldType: 'name',
    })
  }
}

export { ActionSheet }
