import { ItemSheetGURPS } from "@item/base"
import { WeaponGURPS } from "@module/config"

export class WeaponSheet extends ItemSheetGURPS {
	// Get template(): string {
	// 	return `systems/${SYSTEM_NAME}/templates/item/${this.item.type.replaceAll("_", "-")}.hbs`
	// }

	static get defaultOptions() {
		const options = super.defaultOptions
		return mergeObject(super.defaultOptions, {
			classes: options.classes.concat(["item", "gurps"]),
			width: 620,
			min_width: 620,
			height: 800,
		})
	}

	getData(options?: Partial<DocumentSheetOptions<Item>> | undefined) {
		const sheetData = {
			...super.getData(options),
			...{
				attributes: {
					...{ 10: "10" },
					...super.getData(options).attributes,
				},
				defaults: (this.item as any).defaults,
			},
		}
		return sheetData
	}
	// GetData(options?: Partial<FormApplicationOptions> | undefined): any {
	// 	const attributes: Record<string, string> = {}
	// 	const defaultAttributes = game.settings.get(
	// 		SYSTEM_NAME,
	// 		`${SETTINGS.DEFAULT_ATTRIBUTES}.attributes`
	// 	) as Attribute[]
	// 	if (this.item.actor) {
	// 		const actor = this.object.actor as unknown as CharacterGURPS
	// 		for (const e of Object.values(actor.attributes)) {
	// 			attributes[e.attr_id] = e.attribute_def.name
	// 		}
	// 	} else {
	// 		mergeObject(
	// 			attributes,
	// 			defaultAttributes.reduce(function(map: any, obj: any) {
	// 				map[obj.id] = obj.name
	// 				return map
	// 			}, {})
	// 		)
	// 	}
	// 	// return {
	// 	// 	...super.getData(options),
	// 	// 	weapon: this.item,
	// 	// 	config: CONFIG.GURPS,
	// 	// 	attributes: attributes,
	// 	// 	sysPrefix: "",
	// 	// }
	// 	const sheetData = {
	// 		...super.getData(options),
	// 		...{
	// 		},
	// 	}
	// 	return sheetData
	// }

	protected _getHeaderButtons(): Application.HeaderButton[] {
		const all_buttons = super._getHeaderButtons()
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-circled-x"
		return all_buttons
	}
}

export interface WeaponSheet extends ItemSheetGURPS {
	object: WeaponGURPS
}
