import { ContainerSheetGURPS } from "@item/container"
import { ItemGURPS } from "@module/config"
import { ItemType, SETTINGS, SYSTEM_NAME } from "@module/data"
import { i18n, Weight } from "@util"
import { ItemGCS } from "./document"

// @ts-ignore
export class ItemSheetGCS extends ContainerSheetGURPS {
	// GetData(options?: Partial<DocumentSheetOptions<Item>>): any {
	// 	const itemData = this.object.toObject(false)
	// 	const attributes: Record<string, string> = {}
	// 	const locations: Record<string, string> = {}
	// 	const default_attributes = game.settings.get(
	// 		SYSTEM_NAME,
	// 		`${SETTINGS.DEFAULT_ATTRIBUTES}.attributes`
	// 	) as AttributeDefObj[]
	// 	const default_locations = {
	// 		name: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.name`),
	// 		roll: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.roll`),
	// 		locations: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.locations`),
	// 	} as HitLocationTable
	// 	const actor = this.item.actor as unknown as CharacterGURPS
	// 	if (actor) {
	// 		actor.attributes.forEach(e => {
	// 			if (e.attribute_def.type.includes("_separator")) return
	// 			attributes[e.attr_id] = e.attribute_def.name
	// 		})
	// 		for (const e of actor.HitLocations) {
	// 			locations[e.id] = e.choice_name
	// 		}
	// 	} else {
	// 		default_attributes.forEach(e => {
	// 			if (e.type.includes("_separator")) return
	// 			attributes[e.id] = e.name
	// 		})
	// 		default_locations.locations.forEach(e => {
	// 			locations[e.id] = e.choice_name
	// 		})
	// 	}
	// 	attributes.dodge = i18n("gurps.attributes.dodge")
	// 	attributes.parry = i18n("gurps.attributes.parry")
	// 	attributes.block = i18n("gurps.attributes.block")
	// 	const item = this.item as ItemGCS
	// 	const items = this.items

	// 	const sheetData = {
	// 		...super.getData(options),
	// 		...{
	// 			document: item,
	// 			meleeWeapons: items.filter(e => [ItemType.MeleeWeapon].includes(e.type as ItemType)),
	// 			rangedWeapons: items.filter(e => [ItemType.RangedWeapon].includes(e.type as ItemType)),
	// 			item: itemData,
	// 			system: (itemData as any).system,
	// 			config: CONFIG.GURPS,
	// 			attributes: attributes,
	// 			locations: locations,
	// 			// sysPrefix: "array.system.",
	// 			defaultBodyType: default_locations.name,
	// 		},
	// 	}

	// 	return sheetData
	// }

	override activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		ContextMenu.create(this, html, "#melee div", [
			{ name: i18n("gurps.context_menu.new_melee_weapon"), icon: "", callback: () => this._addMelee() },
		])
		ContextMenu.create(this, html, "#ranged div", [
			{ name: i18n("gurps.context_menu.new_ranged_weapon"), icon: "", callback: () => this._addRanged() },
		])
		console.log("epic")
		html.find(".item").on("dblclick", event => this._openItemSheet(event))
	}

	async _addMelee() {
		const newMelee = await this.item.createEmbeddedDocuments(
			"Item",
			[
				{
					type: ItemType.MeleeWeapon,
					name: i18n("ITEM.TypeMelee_weapon"),
					system: {
						usage: i18n("ITEM.TypeMelee_weapon"),
					},
				},
			],
			{}
		)
		this.render()
		const uuid = newMelee[0].uuid
		const item = (await fromUuid(uuid)) as ItemGURPS
		item?.sheet?.render(true)
	}

	async _addRanged() {
		const newRanged = await this.item.createEmbeddedDocuments(
			"Item",
			[
				{
					type: ItemType.RangedWeapon,
					name: i18n("ITEM.TypeRanged_weapon"),
					system: {
						usage: i18n("ITEM.TypeRanged_weapon"),
					},
				},
			],
			{}
		)
		this.render()
		const uuid = newRanged[0].uuid
		const item = (await fromUuid(uuid)) as ItemGURPS
		item?.sheet?.render(true)
	}

	protected override _getHeaderButtons(): Application.HeaderButton[] {
		const buttons: Application.HeaderButton[] = []
		const all_buttons = [...buttons, ...super._getHeaderButtons()]
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-circled-x"
		return all_buttons
	}

	protected async _openItemSheet(event: JQuery.DoubleClickEvent) {
		event.preventDefault()
		console.log("what")
		const uuid = $(event.currentTarget).data("uuid")
		const item = (await fromUuid(uuid)) as ItemGURPS
		console.log(item)
		item?.sheet?.render(true)
	}

	protected async _updateObject(event: Event, formData: Record<string, any>): Promise<unknown> {
		for (const k in formData) {
			if (k.endsWith("qualifier.qualifier_weight")) {
				const units =
					this.item.actor.settings.default_weight_units ??
					(game.settings.get(SYSTEM_NAME, SETTINGS.DEFAULT_SHEET_SETTINGS) as any).default_weight_units
				const weight = Weight.format(Weight.fromString(formData[k]), units)
				formData[k.replace("_weight", "")] = weight
				delete formData[k]
			}
		}
		return super._updateObject(event, formData)
	}
}

// @ts-ignore
export interface ItemSheetGCS extends ContainerSheetGURPS {
	object: ItemGCS
}
