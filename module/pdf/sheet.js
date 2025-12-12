export default class GurpsPDFSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet {
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
    return foundry.utils.mergeObject(context, {
      params: this._getViewerParams(),
      pageNumber: (this.options.pageNumber || 0) + (this.document.system.offset || 0),
    })
  }
}
