import { ItemSheetGURPS } from "@item/base"

export class EffectSheet extends ItemSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["effect"]),
		})
		return options
	}
}
