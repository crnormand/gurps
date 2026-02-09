class GurpsPDFSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet {
  // @ts-expect-error: Wait for FVTT types to catch up.
  static override EDIT_PARTS = foundry.utils.mergeObject(super.EDIT_PARTS, {
    content: {
      template: 'systems/gurps/templates/pdf/edit.hbs',
      classes: ['standard-form'],
    },
  })

  // @ts-expect-error: Wait for FVTT types to catch up.
  static override VIEW_PARTS = foundry.utils.mergeObject(super.VIEW_PARTS, {
    content: {
      template: 'systems/gurps/templates/pdf/view.hbs',
      root: true,
    },
  })

  override async _prepareContext(options: any): Promise<any> {
    const context = await super._prepareContext(options)

    return foundry.utils.mergeObject(context, {
      // @ts-expect-error: Wait for FVTT types to catch up.
      params: this._getViewerParams(),
      // @ts-expect-error: I'm sure I'm missing something on how to declared the options.
      pageNumber: (this.options.pageNumber || 0) + (this.document.system.offset || 0),
    })
  }
}

export { GurpsPDFSheet }
