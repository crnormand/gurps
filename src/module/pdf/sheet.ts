import { SYSTEM_NAME } from "@module/settings";

export class PDFViewerSheet extends DocumentSheet {
	pageNumber = 1;

	constructor(object: any, options: any = { pageNumber: 1 }) {
		super(object, options);
		this.pageNumber = options.pageNumber;
	}

	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["gcs", "pdf"],
			width: 860,
			height: 900,
			resizable: true,
			popOut: true,
		});
	}

	override get template(): string {
		return `systems/${SYSTEM_NAME}/templates/app/pdf.hbs`;
	}

	// Render(force?: boolean | undefined, options?: Application.RenderOptions<DocumentSheetOptions> | undefined): this {
	// 	console.log(force, options);
	// 	return super.render(force, options);
	// }

	// activateListeners(html: JQuery<HTMLElement>): void {
	// 	super.activateListeners(html);
	// 	const target = html.find(".placeholder");
	// 	const frame = document.createElement("iframe");
	// 	frame.src = `scripts/pdfjs/web/viewer.html?${this._getPDFData()}#page=${this.pageNumber}`;
	// 	target.replaceWith(frame);
	// }

	private _getPDFData(): URLSearchParams {
		const params = new URLSearchParams();
		if ((this.object as any).src) {
			// @ts-ignore
			const src = URL.parseSafe(this.object.src) ? this.object.src : foundry.utils.getRoute(this.object.src);
			params.append("file", src);
		}
		return params;
	}

	getData(options?: Partial<DocumentSheetOptions> | undefined): any {
		return mergeObject(super.getData(options), {
			pageNumber: this.pageNumber,
			params: this._getPDFData(),
		});
	}

	// Protected _getHeaderButtons(): Application.HeaderButton[] {
	// 	const buttons = super._getHeaderButtons();
	// 	console.log(buttons);
	// 	return buttons.filter(e => e.class !== "configure-sheet");
	// }
}
