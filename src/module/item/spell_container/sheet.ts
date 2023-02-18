import { ItemSheetGCS } from "@item/gcs"

export class SpellContainerSheet extends ItemSheetGCS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["spell_container"]),
		})
		return options
	}
}
