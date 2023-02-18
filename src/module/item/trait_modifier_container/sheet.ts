import { ContainerSheetGURPS } from "@item/container"

export class TraitModifierContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["modifier_container"]),
		})
		return options
	}
}
