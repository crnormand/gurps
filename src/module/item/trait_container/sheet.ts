import { ContainerSheetGURPS } from "@item/container/sheet"

export class TraitContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["trait_container"]),
		})
		return options
	}

	getData(options?: Partial<DocumentSheetOptions<Item>> | undefined) {
		const items = this.items
		const sheetData = {
			...super.getData(options),
			...{
				modifiers: items.filter(e => e.type.includes("modifier")),
			},
		}
		return sheetData
	}

	protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<unknown> {
		if (Object.keys(formData).includes("system.disabled"))
			formData["system.disabled"] = !formData["system.disabled"]
		return super._updateObject(event, formData)
	}
}
