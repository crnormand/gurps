import { ContainerSheetGURPS } from "@item/container"

export class NoteContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["note_container"]),
		})
		return options
	}
}
