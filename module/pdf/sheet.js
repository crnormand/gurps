// export class GurpsPDFEditSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet {
// COMPATIBILITY: v12

/**
 * Register the GURPS PDF sheet for the current Foundry version.
 * Handles unregistering the core sheet and registering the appropriate GURPS sheet.
 */
export function registerPDFSheet() {
  if ((game.release?.generation ?? 12) >= 13) {
    // @ts-expect-error: unregisterSheet may not be typed in Foundry's API
    foundry.applications.apps.DocumentSheetConfig.unregisterSheet(JournalEntryPage, 'core', JournalPDFPageSheet)
    // @ts-expect-error: registerSheet may not be typed in Foundry's API
    foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, 'gurps', getGurpsPDFSheetV2(), {
      types: ['pdf'],
      makeDefault: true,
      label: 'GURPS PDF Editor Sheet',
    })
  } else {
    DocumentSheetConfig.unregisterSheet(JournalEntryPage, 'core', JournalPDFPageSheet)
    DocumentSheetConfig.registerSheet(JournalEntryPage, 'gurps', getGurpsPDFSheetV1(), {
      types: ['pdf'],
      makeDefault: true,
      label: 'GURPS PDF Editor Sheet',
    })
  }
}

function getGurpsPDFSheetV2() {
  if (!game.release) return
  if (game.release.generation < 13) return

  class GurpsPDFSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet {
    constructor(options) {
      if (!options) options = {}
      options.pageNumber = options?.pageNumber || 1
      super(options)
    }

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
      context = _mergeGameVersionInfo(context)
      return _mergePdfData(this, context)
    }
  }
  return GurpsPDFSheet
}

function getGurpsPDFSheetV1() {
  if (!game.release) return
  if (game.release.generation >= 13) return

  class GurpsPDFSheetV1 extends JournalPDFPageSheet {
    constructor(object, options) {
      if (!options) options = {}
      options.pageNumber = options?.pageNumber || 1
      super(object, options)
    }

    get template() {
      return `systems/gurps/templates/pdf/${this.isView || !this.isEditable ? 'view' : 'edit'}.hbs`
    }

    getData(options) {
      let data = super.getData(options)
      data = _mergeGameVersionInfo(data)
      return _mergePdfData(this, data)
    }

    get isView() {
      return this.options.mode === 'view'
    }
  }
  return GurpsPDFSheetV1
}

const _getPDFData = function (sheet) {
  const params = new URLSearchParams()
  if (sheet.document.src) {
    const src = URL.parseSafe(sheet.document.src) ? sheet.document.src : foundry.utils.getRoute(sheet.document.src)
    params.append('file', src)
  }
  return params
}

const _mergePdfData = function (sheet, data) {
  return foundry.utils.mergeObject(data, {
    pageNumber: sheet.options.pageNumber,
    params: _getPDFData(sheet),
  })
}

const _mergeGameVersionInfo = function (data) {
  return foundry.utils.mergeObject(data, {
    v13: game.release?.generation >= 13,
  })
}

/**
 * Create and return the appropriate GURPS PDF sheet instance for the current Foundry version.
 * @param {any} journalPage - The JournalEntryPage document.
 * @param {number} page - The page number to display.
 * @returns {GurpsPDFSheet | GurpsPDFSheetV1} The appropriate PDF sheet instance.
 */
export function createGurpsPDFSheetViewer(journalPage, page) {
  if ((game.release?.generation ?? 12) >= 13) {
    const GurpsPDFSheetV2 = getGurpsPDFSheetV2()
    return new GurpsPDFSheetV2({ document: journalPage, pageNumber: page, mode: 'view' })
  } else {
    const GurpsPDFSheetV1 = getGurpsPDFSheetV1()
    return new GurpsPDFSheetV1(journalPage, { pageNumber: page, mode: 'view' })
  }
}
