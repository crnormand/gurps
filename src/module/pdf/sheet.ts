class GurpsPDFSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet {
  /** @inheritDoc */
  static override DEFAULT_OPTIONS = {
    form: {
      closeOnSubmit: true,
    },
    position: {
      width: 600,
      height: 780,
    },
  }

  static override EDIT_PARTS = foundry.utils.mergeObject(super.EDIT_PARTS, {
    content: {
      template: 'systems/gurps/templates/pdf/edit.hbs',
      classes: ['standard-form'],
    },
  })

  static override VIEW_PARTS = foundry.utils.mergeObject(super.VIEW_PARTS, {
    content: {
      template: 'systems/gurps/templates/pdf/view.hbs',
      root: true,
    },
  })

  override async _prepareContext(options: any): Promise<any> {
    const context = await super._prepareContext(options)

    return foundry.utils.mergeObject(context, {
      params: this._getViewerParams(),
      // @ts-expect-error: I'm sure I'm missing something on how to declared the options.
      pageNumber: (this.options.pageNumber || 5) + (this.document.system.offset || 0),
    })
  }
}

export { GurpsPDFSheet }
