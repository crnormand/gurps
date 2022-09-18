import { ContainerSheetGURPS } from "@item/container/sheet";

export class NoteContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(["note_container"]),
		});
		return options;
	}
}
