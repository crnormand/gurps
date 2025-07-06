import { DeepPartial } from 'fvtt-types/utils'
import api = foundry.applications.api

export class GurpsPDFSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet {
  static EDIT_PARTS = {
    // @ts-expect-error: Waiting for types to catch up
    header: super.EDIT_PARTS?.header,
    content: {
      template: 'systems/gurps/templates/pdf/edit.hbs',
      classes: ['standard-form'],
    },
    // @ts-expect-error: Waiting for types to catch up
    footer: super.EDIT_PARTS?.footer,
  }

  /* ---------------------------------------- */

  static VIEW_PARTS = {
    content: {
      template: 'systems/gurps/templates/pdf/view.hbs',
      root: true,
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<api.DocumentSheet.RenderOptions> & { isFirstRender: boolean }
  ): Promise<api.DocumentSheet.RenderContext<JournalEntryPage.OfType<'pdf'>>> {
    let context = await super._prepareContext(options)

    Object.assign(context, {
      // @ts-expect-error: Waiting for types to catch up
      params: this._getViewerParams(),
      // @ts-expect-error: Waiting for types to catch up
      pageNumber: (this.options.pageNumber || 0) + (this.document.system.offset || 0),
    })
    return context as api.DocumentSheet.RenderContext<JournalEntryPage.OfType<'pdf'>>
  }
}

/* ---------------------------------------- */

/**
 * Create and return the appropriate GURPS PDF sheet instance for the current Foundry version.
 * @param  journalPage - The JournalEntryPage document.
 * @param  page - The page number to display.
 * @returns  The appropriate PDF sheet instance.
 */
export function createGurpsPDFSheetViewer(journalPage: JournalEntryPage.OfType<'pdf'>, page: number): GurpsPDFSheet {
  // @ts-expect-error: Waiting for types to catch up
  return new GurpsPDFSheet({ document: journalPage, pageNumber: page, mode: 'view' })
}
