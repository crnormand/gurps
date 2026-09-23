import { BookPageReference } from './pdf-refs.js'

/**
 * Register the GURPS PDF sheet for the current Foundry version.
 * Handles unregistering the core sheet and registering the appropriate GURPS sheet.
 */
export function registerPDFSheet() {
  foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
    JournalEntryPage,
    'core',
    foundry.applications.sheets.journal.JournalEntryPagePDFSheet
  )
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, 'gurps', GurpsPDFSheet, {
    types: ['pdf'],
    makeDefault: true,
    label: 'GURPS PDF Editor Sheet',
  })
}

interface Configuration extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet.Configuration {
  bookPageReference?: BookPageReference
}

export class GurpsPDFSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet<
  foundry.applications.sheets.journal.JournalEntryPagePDFSheet.RenderContext,
  Configuration
> {
  static override DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    position: { width: 600, height: 780 },
  }

  /** @inheritDoc */
  static EDIT_PARTS = {
    // @ts-expect-error: super.EDIT_PARTS absolutely exists
    header: super.EDIT_PARTS?.header,
    content: {
      template: 'systems/gurps/templates/pdf/edit.hbs',
      classes: ['standard-form'],
    },
    // @ts-expect-error: super.EDIT_PARTS absolutely exists
    footer: super.EDIT_PARTS?.footer,
  }

  /** @inheritDoc */
  static VIEW_PARTS = {
    content: {
      template: 'systems/gurps/templates/pdf/view.hbs',
      root: true,
    },
  }

  override async _prepareContext(options: any) {
    let context = await super._prepareContext(options)

    // @ts-expect-error: document.system.offset may not be recognized by TypeScript
    const page = (this.options.bookPageReference?.page || 0) + (this.document.system.offset || 0)

    context = foundry.utils.mergeObject(context, {
      // @ts-expect-error: _getViewerParams may not be recognized by TypeScript
      params: this._getViewerParams(),
      pageNumber: page,
      v13: (game.release?.generation ?? 14) >= 13,
    })

    return context
  }
}
