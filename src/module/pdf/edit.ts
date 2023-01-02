import { SYSTEM_NAME } from "@module/data"

// @ts-ignore
export class PDFEditorSheet extends JournalPDFPageSheet {
	constructor(object: any, options: any = { pageNumber: 1 }) {
		super(object, options)
	}

	get template(): string {
		// @ts-ignore
		return `systems/${SYSTEM_NAME}/templates/app/pdf-${this.isEditable ? "edit" : "view"}.hbs`
	}

	getData(options?: Partial<DocumentSheetOptions> | undefined): any {
		return super.getData(options)
	}
}
