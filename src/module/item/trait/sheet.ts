import { ContainerSheetGURPS } from "@item/container"
import { ItemType } from "@module/data"

export class TraitSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["trait"]),
		})
		return options
	}

	getData(options?: Partial<DocumentSheetOptions<Item>> | undefined) {
		const items = this.items
		const sheetData = {
			...super.getData(options),
			...{
				modifiers: items.filter(e =>
					[ItemType.TraitModifier, ItemType.TraitModifierContainer].includes(e.type as ItemType)
				),
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
