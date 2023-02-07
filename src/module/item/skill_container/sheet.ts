import { ContainerSheetGURPS } from "@item/container"

export class SkillContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["skill_container"]),
		})
		return options
	}
}
