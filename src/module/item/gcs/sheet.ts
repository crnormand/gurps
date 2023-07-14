import { ContainerSheetGURPS } from "@item/container"
import { ItemGURPS } from "@module/config"
import { ItemType, SETTINGS, SYSTEM_NAME } from "@module/data"
import { LocalizeGURPS, Weight } from "@util"
import { ItemGCS } from "./document"

export class ItemSheetGCS extends ContainerSheetGURPS {
	override activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find(".item").on("dblclick", event => this._openItemSheet(event))
		html.find(".item").on("contextmenu", event => this._getItemContextMenu(event, html))
		html.find(".item-list .header.desc").on("contextmenu", event => this._getAddItemMenu(event, html))
	}

	async _getItemContextMenu(event: JQuery.ContextMenuEvent, html: JQuery<HTMLElement>) {
		event.preventDefault()
		const id = $(event.currentTarget).data("item-id")
		const item = this.item.deepItems.get(id) as ItemGURPS
		if (!item) return
		const ctx = new ContextMenu(html, ".menu", [])
		ctx.menuItems.push({
			name: LocalizeGURPS.translations.gurps.context.duplicate,
			icon: "",
			callback: async () => {
				const itemData = {
					type: item.type,
					name: item.name,
					system: item.system,
					flags: (item as any).flags,
					sort: ((item as any).sort ?? 0) + 1,
				}
				await item.container?.createEmbeddedDocuments("Item", [itemData])
			},
		})
		ctx.menuItems.push({
			name: LocalizeGURPS.translations.gurps.context.delete,
			icon: "<i class='gcs-trash'></i>",
			callback: () => {
				return item.delete()
			},
		})
		await ctx.render($(event.currentTarget))
	}

	async _getAddItemMenu(event: JQuery.ContextMenuEvent, html: JQuery<HTMLElement>) {
		event.preventDefault()
		const element = $(event.currentTarget)
		const type = element.parent(".item-list")[0].id
		const ctx = new ContextMenu(html, ".menu", [])
		ctx.menuItems = (function (self: ItemSheetGCS): ContextMenuEntry[] {
			switch (type) {
				case "trait-modifiers":
					return [
						{
							name: LocalizeGURPS.translations.gurps.context.new_trait_modifier,
							icon: "<i class='gcs-modifier'></i>",
							callback: () => self._newItem(ItemType.TraitModifier),
						},
						{
							name: LocalizeGURPS.translations.gurps.context.new_trait_modifier_container,
							icon: "<i class='gcs-modifier'></i>",
							callback: () => self._newItem(ItemType.TraitModifierContainer),
						},
					]
				case "equipment-modifiers":
					return [
						{
							name: LocalizeGURPS.translations.gurps.context.new_equipment_modifier,
							icon: "<i class='gcs-eqp-modifier'></i>",
							callback: () => self._newItem(ItemType.EquipmentModifier),
						},
						{
							name: LocalizeGURPS.translations.gurps.context.new_equipment_modifier_container,
							icon: "<i class='gcs-eqp-modifier'></i>",
							callback: () => self._newItem(ItemType.EquipmentModifierContainer),
						},
					]
				case "melee":
					return [
						{
							name: LocalizeGURPS.translations.gurps.context.new_melee_weapon,
							icon: "<i class='gcs-melee-weapon'></i>",
							callback: () => self._newItem(ItemType.MeleeWeapon),
						},
					]
				case "ranged":
					return [
						{
							name: LocalizeGURPS.translations.gurps.context.new_ranged_weapon,
							icon: "<i class='gcs-ranged-weapon'></i>",
							callback: () => self._newItem(ItemType.RangedWeapon),
						},
					]
				default:
					return []
			}
		})(this)
		await ctx.render(element)
	}

	async _newItem(type: ItemType, other = false) {
		const itemName = `TYPES.Item.${type}`
		const itemData: any = {
			type,
			name: game.i18n.localize(itemName),
			system: {},
		}
		if (other) itemData.system.other = true
		await this.object.createEmbeddedDocuments("Item", [itemData], {
			temporary: false,
			renderSheet: true,
			substitutions: false,
		})
	}

	protected async _openItemSheet(event: JQuery.DoubleClickEvent) {
		event.preventDefault()
		const id = $(event.currentTarget).data("item-id")
		const item = this.item.deepItems.get(id)
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

export interface ItemSheetGCS extends ContainerSheetGURPS {
	object: ItemGCS
}
