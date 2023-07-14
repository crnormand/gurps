import { EquipmentContainerGURPS } from "@item/equipment_container"
import { ItemSheetGCS } from "@item/gcs"
import { ItemType, SYSTEM_NAME } from "@module/data"
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
		this.object.prepareData()
		const data = super.getData(options)
		return mergeObject(data, {
			modifiers: this.object.modifiers,
			meleeWeapons: data.items.filter((e: any) => e.type === ItemType.MeleeWeapon),
			// meleeWeapons: this.object.meleeWeapons,
			// rangedWeapons: this.object.rangedWeapons,
		})
	}
}

export interface EquipmentSheet extends ItemSheetGCS {
	object: EquipmentGURPS | EquipmentContainerGURPS
}
