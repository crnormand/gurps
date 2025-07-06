import TypeDataModel = foundry.abstract.TypeDataModel
import fields = foundry.data.fields

/* ---------------------------------------- */

const pdfPageSchema = () => {
  return {
    code: new fields.StringField({ required: true, nullable: false }),
    offset: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  }
}

type PDFPageSchema = ReturnType<typeof pdfPageSchema>

/* ---------------------------------------- */

class GurpsJournalEntryPDFPage extends TypeDataModel<PDFPageSchema, JournalEntryPage.Implementation> {
  static override defineSchema(): PDFPageSchema {
    return pdfPageSchema()
  }
}

/* ---------------------------------------- */

export { GurpsJournalEntryPDFPage }
