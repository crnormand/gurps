import { EquipmentContainerGURPS } from "@item/equipment_container"
import { ItemSheetGCS } from "@item/gcs"
import { SYSTEM_NAME } from "@module/data"
import { EquipmentGURPS } from "./document"

export class EquipmentSheet extends ItemSheetGCS {
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
		const data = super.getData(options)
		const modifiers = this.object.modifiers
		return mergeObject(data, {
			modifiers,
		})
	}
}

export interface EquipmentSheet extends ItemSheetGCS {
	object: EquipmentGURPS | EquipmentContainerGURPS
}
