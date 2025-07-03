// export class GurpsPDFEditSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet {
// COMPATIBILITY: v12

/**
 * Register the GURPS PDF sheet for the current Foundry version.
 * Handles unregistering the core sheet and registering the appropriate GURPS sheet.
 */
export function registerPDFSheet() {
  // @ts-expect-error: unregisterSheet may not be typed in Foundry's API
  foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
    JournalEntryPage,
    'core',
    foundry.applications.sheets.journal.JournalPDFPageSheet
  )
  // @ts-expect-error: registerSheet may not be typed in Foundry's API
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, 'gurps', getGurpsPDFSheetV2(), {
    types: ['pdf'],
    makeDefault: true,
    label: 'GURPS PDF Editor Sheet',
  })
}

function getGurpsPDFSheetV2() {
  class GurpsPDFSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet {
    /** @inheritDoc */
    static EDIT_PARTS = {
      header: super.EDIT_PARTS?.header,
      content: {
        template: 'systems/gurps/templates/pdf/edit.hbs',
        classes: ['standard-form'],
      },
      footer: super.EDIT_PARTS?.footer,
    }

    /** @inheritDoc */
    static VIEW_PARTS = {
      content: {
        template: 'systems/gurps/templates/pdf/view.hbs',
        root: true,
      },
    }

    async _prepareContext(options) {
      let context = await super._prepareContext(options)
      context = addPDFContext(this, context)
      return context
    }
  }
  return GurpsPDFSheet
}

const addPDFContext = (instance, context) => {
  return foundry.utils.mergeObject(context, {
    params: instance._getViewerParams(),
    pageNumber: (instance.options.pageNumber || 0) + (instance.document.system.offset || 0),
  })
}

/**
 * Create and return the appropriate GURPS PDF sheet instance for the current Foundry version.
 * @param {any} journalPage - The JournalEntryPage document.
 * @param {number} page - The page number to display.
 * @returns {GurpsPDFSheet | GurpsPDFSheetV1} The appropriate PDF sheet instance.
 */
export function createGurpsPDFSheetViewer(journalPage, page) {
  const GurpsPDFSheetV2 = getGurpsPDFSheetV2()
  return new GurpsPDFSheetV2({ document: journalPage, pageNumber: page, mode: 'view' })
}
