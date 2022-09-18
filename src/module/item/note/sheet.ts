import { ItemSheetGURPS } from "@item/base/sheet";

export class NoteSheet extends ItemSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(["note"]),
		});
		return options;
	}
}
