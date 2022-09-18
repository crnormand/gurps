import { ContainerSheetGURPS } from "@item/container/sheet";

export class EquipmentModifierContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(["eqp_modifier_container"]),
		});
		return options;
	}
}
