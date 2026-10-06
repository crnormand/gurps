import { BookPageReference } from './pdf-refs.ts'

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

interface PdfConfiguration extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet.Configuration {
  bookPageReference?: BookPageReference
}

interface PdfRenderContext extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet.RenderContext {
  pageNumber: number
  v13: boolean
}

interface PdfRende4rOptions extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet.RenderOptions {
  params?: URLSearchParams
  pageNumber?: number
  v13?: boolean
}

export class GurpsPDFSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet<
  PdfRenderContext,
  PdfConfiguration,
  PdfRende4rOptions
> {
  static override DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    position: { width: 600, height: 780 },
  }

  /** @inheritDoc */
  static override EDIT_PARTS = {
    header: super.EDIT_PARTS?.header,
    content: {
      template: 'systems/gurps/templates/pdf/edit.hbs',
      classes: ['standard-form'],
    },
    footer: super.EDIT_PARTS?.footer,
  }

  /** @inheritDoc */
  static override VIEW_PARTS = {
    content: {
      template: 'systems/gurps/templates/pdf/view.hbs',
      root: true,
    },
  }

  override async _prepareContext(options: any) {
    let context = await super._prepareContext(options)

    const page = (this.options.bookPageReference?.page || 0) + (this.document.system.offset || 0)

    context = {
      ...context,
      params: this._getViewerParams(),
      pageNumber: page,
      v13: (game.release?.generation ?? 14) >= 13,
    }

    return context
  }
}
