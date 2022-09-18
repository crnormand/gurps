import { ContainerSheetGURPS } from "@item/container/sheet";

export class SpellContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(["spell_container"]),
		});
		return options;
	}
}
