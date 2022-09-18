import { ContainerSheetGURPS } from "@item/container/sheet";

export class SkillContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(["skill_container"]),
		});
		return options;
	}
}
