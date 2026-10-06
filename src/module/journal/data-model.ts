import { fields, TypeDataModel } from '@gurps-types/foundry/index.js'

const pdfPageSchema = () => ({
  offset: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  code: new fields.StringField({ required: true, nullable: false, initial: '' }),
})

type PdfPageSchema = ReturnType<typeof pdfPageSchema>

export class PdfPageModel extends TypeDataModel<PdfPageSchema, JournalEntryPage.Implementation> {
  static override defineSchema(): PdfPageSchema {
    return pdfPageSchema()
  }
}

export function registerPDFDataModel(): void {
  CONFIG.JournalEntryPage.dataModels.pdf = PdfPageModel
}
