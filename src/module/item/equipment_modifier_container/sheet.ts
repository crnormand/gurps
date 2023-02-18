import { ContainerSheetGURPS } from "@item/container"

export class EquipmentModifierContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["eqp_modifier_container"]),
		})
		return options
	}
}
