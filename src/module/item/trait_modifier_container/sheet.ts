import { ContainerSheetGURPS } from "@item/container/sheet";

export class TraitModifierContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(["modifier_container"]),
		});
		return options;
	}
}
