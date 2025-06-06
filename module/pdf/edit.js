// export class PDFEditorSheet extends foundry.applications.sheets.journal.JournalEntryPagePDFSheet {
// COMPATIBILITY: v12
export class PDFEditorSheet extends JournalPDFPageSheet {
  constructor(object, options = { pageNumber: 1 }) {
    super(object, options)
  }

  get template() {
    // return `systems/gurps/templates/pdf/edit.hbs`
    return `systems/gurps/templates/pdf/${this.isEditable ? 'edit' : 'view'}.hbs`
  }
}
