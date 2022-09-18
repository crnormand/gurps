import { SYSTEM_NAME } from "@module/settings";

// @ts-ignore
export class PDFEditorSheet extends JournalPDFPageSheet {
	constructor(object: any, options: any = { pageNumber: 1 }) {
		super(object, options);
	}

	// Static get defaultOptions() {
	// 	return mergeObject(super.defaultOptions, {
	// 		// classes: ["gcs", "pdf"],
	// 		// width: 630,
	// 		// height: 900,
	// 		// resizable: true,
	// 		// popOut: true,
	// 	});
	// }

	get template(): string {
		return `systems/${SYSTEM_NAME}/templates/app/pdf-edit.hbs`;
	}

	// Render(force?: boolean | undefined, options?: Application.RenderOptions<DocumentSheetOptions> | undefined): this {
	// 	console.log(force, options);
	// 	return super.render(force, options);
	// }

	// private _getPDFData(): URLSearchParams {
	// 	const params = new URLSearchParams();
	// 	if (((this as any).object as any).src) {
	// 		//@ts-ignore
	// 		const src = URL.parseSafe(this.object.src) ? this.object.src : foundry.utils.getRoute(this.object.src);
	// 		params.append("file", src);
	// 	}
	// 	return params;
	// }

	getData(options?: Partial<DocumentSheetOptions> | undefined): any {
		return super.getData(options);
	}

	// Protected _getHeaderButtons(): Application.HeaderButton[] {
	// 	const buttons = super._getHeaderButtons();
	// 	console.log(buttons);
	// 	return buttons.filter(e => e.class !== "configure-sheet");
	// }
}
