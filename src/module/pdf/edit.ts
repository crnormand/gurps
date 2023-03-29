import { SYSTEM_NAME } from "@module/data"

// @ts-ignore
class PDFEditorSheet extends JournalPDFPageSheet {
	get template(): string {
		return `systems/${SYSTEM_NAME}/templates/app/pdf-${this.isEditable ? "edit" : "view"}.hbs`
	}

	protected async _updateObject(event: Event, formData: any): Promise<unknown> {
		await super._updateObject(event, formData)
		// @ts-ignore
		return this.render(true)
	}
}

// @ts-ignore
interface PDFEditorSheet extends JournalPDFPageSheet {
	isEditable: boolean
}

export { PDFEditorSheet }
