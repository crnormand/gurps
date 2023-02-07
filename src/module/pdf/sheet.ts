import { SYSTEM_NAME } from "@module/data"

export class PDFViewerSheet extends DocumentSheet<DocumentSheetOptions<JournalEntry>, JournalEntry> {
	pageNumber = 1

	constructor(object: any, options: any = { pageNumber: 1 }) {
		super(object, options)
		this.pageNumber = options.pageNumber
	}

	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["gurps", "pdf"],
			width: 860,
			height: 900,
			resizable: true,
			popOut: true,
		})
	}

	override get template(): string {
		return `systems/${SYSTEM_NAME}/templates/app/pdf.hbs`
	}

	private _getPDFData(): URLSearchParams {
		const params = new URLSearchParams()
		if ((this.object as any).src) {
			// @ts-ignore
			const src = URL.parseSafe(this.object.src) ? this.object.src : foundry.utils.getRoute(this.object.src)
			params.append("file", src)
		}
		return params
	}

	getData(options?: DocumentSheetOptions<JournalEntry>): any {
		return mergeObject(super.getData(options), {
			pageNumber: this.pageNumber,
			params: this._getPDFData(),
		})
	}
}
