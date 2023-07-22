import { ActorSheetGURPS } from "@actor/base"
import { EquipmentContainerGURPS, EquipmentGURPS } from "@item"
import { ItemGURPS } from "@module/config"
import { ItemType, SYSTEM_NAME } from "@module/data"
import { PDF } from "@module/pdf"
import { dollarFormat, LocalizeGURPS, Weight } from "@util"
import EmbeddedCollection from "types/foundry/common/abstract/embedded-collection.mjs"
import { LootGURPS } from "./document"

export class LootSheetGURPS extends ActorSheetGURPS {
	static override get defaultOptions(): ActorSheet.Options {
		return mergeObject(super.defaultOptions, {
			classes: super.defaultOptions.classes.concat(["character"]),
			width: 800,
			height: 800,
		})
	}

	override get template(): string {
		return `/systems/${SYSTEM_NAME}/templates/actor/loot/sheet.hbs`
	}

	protected _onDrop(event: DragEvent): void {
		super._onDrop(event)
	}

	override activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)

		html.find(".dropdown-toggle").on("click", event => this._onCollapseToggle(event))
		html.find(".ref").on("click", event => PDF.handle(event))
		html.find(".item-list .header.desc").on("contextmenu", event => this._getAddItemMenu(event, html))
		html.find(".item").on("dblclick", event => this._openItemSheet(event))
		html.find(".item").on("contextmenu", event => this._getItemContextMenu(event, html))
		html.find(".equipped").on("click", event => this._onEquippedToggle(event))
		html.find(".item").on("dragover", event => this._onDragItem(event))
	}

	async _getAddItemMenu(event: JQuery.ContextMenuEvent, html: JQuery<HTMLElement>) {
		event.preventDefault()
		const element = $(event.currentTarget)
		const type = element.parent(".item-list")[0].id
		const ctx = new ContextMenu(html, ".menu", [])
		ctx.menuItems = (function (self: LootSheetGURPS): ContextMenuEntry[] {
			switch (type) {
				case "equipment":
					return [
						{
							name: LocalizeGURPS.translations.gurps.context.new_carried_equipment,
							icon: "<i class='gcs-equipment'></i>",
							callback: () => self._newItem(ItemType.Equipment),
						},
						{
							name: LocalizeGURPS.translations.gurps.context.new_carried_equipment_container,
							icon: "<i class='gcs-equipment'></i>",
							callback: () => self._newItem(ItemType.EquipmentContainer),
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
		await this.actor.createEmbeddedDocuments("Item", [itemData], {
			temporary: false,
			renderSheet: true,
			substitutions: false,
		})
	}

	async _newNaturalAttacks() {
		const itemName = LocalizeGURPS.translations.gurps.item.natural_attacks
		const itemData = {
			type: ItemType.Trait,
			name: itemName,
			system: {
				reference: "B271",
			},
			flags: {
				[SYSTEM_NAME]: {
					contentsData: [
						{
							type: ItemType.MeleeWeapon,
							name: "Bite",
							_id: randomID(),
							system: {
								usage: "Bite",
								reach: "C",
								parry: "No",
								block: "No",
								strength: "",
								damage: {
									type: "cr",
									st: "thr",
									base: "-1",
								},
								defaults: [{ type: "dx" }, { type: "skill", name: "Brawling" }],
							},
						},
						{
							type: ItemType.MeleeWeapon,
							name: "Punch",
							_id: randomID(),
							system: {
								usage: "Punch",
								reach: "C",
								parry: "0",
								strength: "",
								damage: {
									type: "cr",
									st: "thr",
									base: "-1",
								},
								defaults: [
									{ type: "dx" },
									{ type: "skill", name: "Boxing" },
									{ type: "skill", name: "Brawling" },
									{ type: "skill", name: "Karate" },
								],
							},
						},
						{
							type: ItemType.MeleeWeapon,
							name: "Kick",
							_id: randomID(),
							system: {
								usage: "Kick",
								reach: "C,1",
								parry: "No",
								strength: "",
								damage: {
									type: "cr",
									st: "thr",
								},
								defaults: [
									{ type: "dx", modifier: -2 },
									{ type: "skill", name: "Brawling", modifier: -2 },
									{ type: "skill", name: "Kicking" },
									{ type: "skill", name: "Karate", modifier: -2 },
								],
							},
						},
					],
				},
			},
		}
		const item = (await this.actor.createEmbeddedDocuments("Item", [itemData], { temporary: false }))[0]
		return item.sheet.render(true)
	}

	async _getItemContextMenu(event: JQuery.ContextMenuEvent, html: JQuery<HTMLElement>) {
		event.preventDefault()
		const id = $(event.currentTarget).data("item-id")
		const item = this.actor.equipment.get(id)
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
				await item.container?.createEmbeddedDocuments("Item", [itemData as any], {})
			},
		})
		ctx.menuItems.push({
			name: LocalizeGURPS.translations.gurps.context.delete,
			icon: "<i class='gcs-trash'></i>",
			callback: () => {
				return item.delete()
			},
		})
		ctx.menuItems.push({
			name: LocalizeGURPS.translations.gurps.context.toggle_state,
			icon: "<i class='fas fa-sliders-simple'></i>",
			callback: () => {
				return item.update({ "system.equipped": !item.equipped })
			},
		})
		ctx.menuItems.push({
			name: LocalizeGURPS.translations.gurps.context.increment,
			icon: "<i class='fas fa-up'></i>",
			callback: () => {
				return item.update({ "system.quantity": item.system.quantity + 1 })
			},
		})
		if (item.quantity > 0)
			ctx.menuItems.push({
				name: LocalizeGURPS.translations.gurps.context.decrement,
				icon: "<i class='fas fa-down'></i>",
				callback: () => {
					return item.update({ "system.quantity": item.system.quantity - 1 })
				},
			})
		ctx.menuItems.push({
			name: LocalizeGURPS.translations.gurps.context.increase_tech_level,
			icon: "<i class='fas fa-gear'></i><i class='fas fa-up'></i>",
			callback: () => {
				let tl = item.techLevel
				let tlNumber = tl.match(/\d+/)?.[0]
				if (!tlNumber) return
				const newTLNumber = parseInt(tlNumber) + 1
				tl = tl.replace(tlNumber, `${newTLNumber}`)
				return item.update({ "system.tech_level": tl })
			},
		})
		if (parseInt(item.techLevel) > 0)
			ctx.menuItems.push({
				name: LocalizeGURPS.translations.gurps.context.decrease_tech_level,
				icon: "<i class='fas fa-gear'></i><i class='fas fa-down'></i>",
				callback: () => {
					let tl = item.techLevel
					let tlNumber = tl.match(/\d+/)?.[0]
					if (!tlNumber) return
					const newTLNumber = parseInt(tlNumber) - 1
					tl = tl.replace(tlNumber, `${newTLNumber}`)
					return item.update({ "system.tech_level": tl })
				},
			})
		if (item instanceof EquipmentGURPS)
			ctx.menuItems.push({
				name: LocalizeGURPS.translations.gurps.context.convert_to_container,
				icon: "",
				callback: async () => {
					const itemData = {
						type: ItemType.EquipmentContainer,
						name: item.name,
						system: item.system,
						flags: (item as any).flags,
						sort: ((item as any).sort ?? 0) + 1,
						_id: item._id,
					}
					await item.delete()
					await item.container?.createEmbeddedDocuments("Item", [itemData])
				},
			})
		if (item instanceof EquipmentContainerGURPS && item.children.size === 0)
			ctx.menuItems.push({
				name: LocalizeGURPS.translations.gurps.context.convert_to_non_container,
				icon: "",
				callback: async () => {
					const itemData = {
						type: ItemType.Equipment,
						name: item.name,
						system: item.system,
						flags: (item as any).flags,
						sort: ((item as any).sort ?? 0) + 1,
						_id: item._id,
					}
					await item.delete()
					await item.container?.createEmbeddedDocuments("Item", [itemData])
				},
			})
		await ctx.render($(event.currentTarget))
	}

	protected _resizeInput(event: JQuery.ChangeEvent) {
		event.preventDefault()
		const field = event.currentTarget
		$(field).css("min-width", `${field.value.length}ch`)
	}

	protected _onCollapseToggle(event: JQuery.ClickEvent): void {
		event.preventDefault()
		const id: string = $(event.currentTarget).data("item-id")
		const open = !!$(event.currentTarget).attr("class")?.includes("closed")
		const item = this.actor.items.get(id)
		item?.update({ _id: id, "system.open": open })
	}

	protected async _openItemSheet(event: JQuery.DoubleClickEvent) {
		event.preventDefault()
		const id: string = $(event.currentTarget).data("item-id")
		const item = this.actor.items.get(id)
		item?.sheet?.render(true)
	}

	protected async _onEquippedToggle(event: JQuery.ClickEvent) {
		event.preventDefault()
		const id = $(event.currentTarget).data("item-id")
		const item = this.actor.items.get(id)
		return item?.update({
			"system.equipped": !(item as EquipmentGURPS).equipped,
		})
	}

	protected _onDragItem(event: JQuery.DragOverEvent): void {
		let element = $(event.currentTarget!).closest(".item.desc")
		if (!element.length) return
		const heightAcross = (event.pageY! - element.offset()!.top) / element.height()!
		const widthAcross = (event.pageX! - element.offset()!.left) / element.width()!
		const inContainer = widthAcross > 0.3 && element.hasClass("container")
		if (heightAcross > 0.5 && element.hasClass("border-bottom")) return
		if (heightAcross < 0.5 && element.hasClass("border-top")) return
		if (inContainer && element.hasClass("border-in")) return

		$(".border-bottom").removeClass("border-bottom")
		$(".border-top").removeClass("border-top")
		$(".border-in").removeClass("border-in")

		const parent = element.parent(".item-list")
		let selection = []
		if (parent.attr("id") === "equipment") {
			selection = [
				...Array.prototype.slice.call(element.prevUntil(".reference")),
				...Array.prototype.slice.call(element.nextUntil(".equipped")),
			]
		} else if (parent.attr("id") === "other-equipment") {
			selection = [
				...Array.prototype.slice.call(element.prevUntil(".reference")),
				...Array.prototype.slice.call(element.nextUntil(".quantity")),
			]
		} else selection = Array.prototype.slice.call(element.nextUntil(".item.desc"))
		selection.unshift(element)
		if (inContainer) {
			for (const e of selection) $(e).addClass("border-in")
		} else if (heightAcross > 0.5) {
			for (const e of selection) $(e).addClass("border-bottom")
		} else {
			for (const e of selection) $(e).addClass("border-top")
		}
	}

	getData(options?: Partial<ActorSheet.Options> | undefined): any {
		const actorData = this.actor.toObject(false) as any
		const items = deepClone(
			(this.actor.items as EmbeddedCollection<any, any>)
				.map(item => item)
				.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
		)

		const sheetData = {
			...super.getData(options),
			...{
				system: actorData.system,
				items,
				settings: (actorData.system as any).settings,
				current_year: new Date().getFullYear(),
				editing: true,
			},
		}
		this.prepareItems(sheetData)
		return sheetData
	}

	prepareItems(data: any) {
		const [equipment, other_equipment] = data.items.reduce(
			(arr: ItemGURPS[][], item: ItemGURPS) => {
				if (item instanceof EquipmentGURPS || item instanceof EquipmentContainerGURPS) {
					if (item.other) arr[1].push(item)
					else arr[0].push(item)
				}
				return arr
			},
			[[], []]
		)

		const carried_value = this.actor.wealthCarried()
		let carried_weight = this.actor.weightCarried(true)

		// Data.carried_weight = `${carried_weight} lb`
		data.carried_weight = Weight.format(carried_weight, this.actor.settings.default_weight_units)
		data.carried_value = dollarFormat(carried_value)

		data.equipment = equipment
		data.other_equipment = other_equipment
		data.blocks = {
			equipment: equipment,
			other_equipment: other_equipment,
		}
	}

	protected override _getHeaderButtons(): Application.HeaderButton[] {
		// Const buttons: Application.HeaderButton[] = this.actor.canUserModify(game.user!, "update")
		// 	? [
		// 		{
		// 			label: "",
		// 			class: "gmenu",
		// 			icon: "gcs-all-seeing-eye",
		// 			onclick: event => this._openGMenu(event),
		// 		},
		// 	]
		// 	: []
		const buttons: Application.HeaderButton[] = []
		const all_buttons = [...buttons, ...super._getHeaderButtons()]
		return all_buttons
	}
}

export interface LootSheetGURPS extends ActorSheetGURPS {
	editing: boolean
	object: LootGURPS
}
