import { ContainerSheetGURPS } from "@item/container"

export class SpellContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["spell_container"]),
		})
		return options
	}
}
