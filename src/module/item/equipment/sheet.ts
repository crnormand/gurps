import { ContainerSheetGURPS } from "@item/container"
import { SYSTEM_NAME } from "@module/data"

export class EquipmentSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["equipment"]),
		})
		return options
	}

	get template(): string {
		return `/systems/${SYSTEM_NAME}/templates/item/equipment/sheet.hbs`
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
}
