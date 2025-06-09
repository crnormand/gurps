// export class GurpsPDFEditSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet {
// COMPATIBILITY: v12

export class GurpsPDFSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet {
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

export class GurpsPDFSheetV1 extends JournalPDFPageSheet {
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
