import { ItemSheetGURPS } from "@item/base"

export class NoteSheet extends ItemSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["note"]),
		})
		return options
	}
}
