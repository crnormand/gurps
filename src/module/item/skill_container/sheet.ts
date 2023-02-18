import { ItemSheetGCS } from "@item/gcs"

export class SkillContainerSheet extends ItemSheetGCS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["skill_container"]),
		})
		return options
	}
}
