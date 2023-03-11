import { ItemSheetGCS } from "@item/gcs"
import { TraitGURPS } from "./document"

export class TraitSheet extends ItemSheetGCS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["trait"]),
		})
		return options
	}

	getData(options?: Partial<DocumentSheetOptions<Item>> | undefined) {
		const data = super.getData(options)
		const modifiers = this.object.modifiers
		return mergeObject(data, {
			modifiers,
		})
	}

	protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<unknown> {
		if (Object.keys(formData).includes("system.disabled"))
			formData["system.disabled"] = !formData["system.disabled"]
		return super._updateObject(event, formData)
	}
}

export interface TraitSheet extends ItemSheetGCS {
	object: TraitGURPS
}
