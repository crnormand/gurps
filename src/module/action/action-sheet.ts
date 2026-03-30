import { HandlebarsApplicationMixin, Application } from '@gurps-types/foundry/index.js'
import { PseudoDocumentSheet } from '@module/pseudo-document/pseudo-document-sheet.js'
import { systemPath } from '@module/util/misc.js'

import { Action } from './index.js'

/* ---------------------------------------- */

namespace ActionSheet {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Configuration extends PseudoDocumentSheet.Configuration<Action.Any> {}

  export interface RenderContext extends PseudoDocumentSheet.RenderContext<Action.Any> {
    action: Action.Any | null
  }
}

/* ---------------------------------------- */

class ActionSheet extends PseudoDocumentSheet<Action.Any> {
  static override DEFAULT_OPTIONS = {
    classes: ['action-sheet'],
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
      template: systemPath('templates/action/tab-details.hbs'),
      scrollable: [''],
    },
    actions: {
      template: systemPath('templates/item/modern/tab-actions.hbs'),
      scrollable: [''],
    },
    modifiers: {
      template: systemPath('templates/item/modern/tab-modifiers.hbs'),
      scrollable: [''],
    },
  }

  /* ---------------------------------------- */

  static override TABS: Record<string, Application.TabsConfiguration> = {
    primary: {
      tabs: [
        { id: 'details', label: 'Details', icon: 'fas fa-user' },
        { id: 'actions', label: 'Actions', icon: 'fas fa-swords' },
        { id: 'modifiers', label: 'Modifiers', icon: 'fas fa-swords' },
      ],
      initial: 'details',
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
}

export { ActionSheet }
