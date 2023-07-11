import { StaticItem, _BaseComponent } from "@actor/static_character/components"
import { ItemFlags } from "@item/base/data"
import { ItemType, SYSTEM_NAME } from "@module/data"
import { LocalizeGURPS, Static } from "@util"
import { StaticItemGURPS } from "."
import { StaticItemSystemData } from "./data"
import { StaticPopout, StaticPopoutType } from "./popouts"

export class StaticItemSheet extends ItemSheet {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			width: 620,
			min_width: 620,
			height: 800,
			classes: options.classes.concat(["gurps", "item", "legacy-equipment"]),
		})
		return options
	}

	get template(): string {
		return `/systems/${SYSTEM_NAME}/templates/item/legacy_equipment/sheet.hbs`
	}

	getData(options?: Partial<DocumentSheetOptions<Item>> | undefined) {
		let deprecation: string = this.item.getFlag(SYSTEM_NAME, ItemFlags.Deprecation) ? "acknowledged" : "manual"
		console.log(this.item)
		const sheetData = {
			...(super.getData(options) as any),
			traits: Object.entries(this.item.system.ads).map(([k, v]) => {
				return { key: k, data: v }
			}),
			skills: Object.entries(this.item.system.skills).map(([k, v]) => {
				return { key: k, data: v }
			}),
			spells: Object.entries(this.item.system.spells).map(([k, v]) => {
				return { key: k, data: v }
			}),
			melee: Object.entries(this.item.system.melee).map(([k, v]) => {
				return { key: k, data: v }
			}),
			ranged: Object.entries(this.item.system.ranged).map(([k, v]) => {
				return { key: k, data: v }
			}),
		}
		sheetData.data = this.item.system
		sheetData.system = this.item.system
		sheetData.data.eqt.f_count = this.item.system.eqt.count // Hack for Furnace module
		sheetData.name = this.item.name
		sheetData.deprecation = deprecation
		if (!this.item.system.globalid && !this.item.parent)
			this.item.update({ "system.globalid": this.item.id, _id: this.item.id })
		return sheetData
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		// html.find("#itemname").on("change", ev => {
		// 	let nm = String($(ev.currentTarget).val) let commit = { "system.eqt.name": nm, name: nm }
		// 	Static.recurseList(this.item.system.melee, (_e, k, _d) => {
		// 		commit = { ...commit, ...{ [`sytem.melee.${k}.name`]: nm } }
		// 	})
		// 	Static.recurseList(this.item.system.ranged, (_e, k, _d) => {
		// 		commit = { ...commit, ...{ [`system.melee.${k}.name`]: nm } }
		// 	})
		// 	this.item.update(commit)
		// })
		html.find(".item-list .header.desc").on("contextmenu", event => this._getAddItemMenu(event, html))
		html.find(".item").on("contextmenu", event => this._getItemContextMenu(event, html))

		// html.find("#add-melee").on("click", ev => {
		// 	ev.preventDefault()
		// 	let m = new StaticMelee()
		// 	m.name = this.item.name || ""
		// 	this._addToList("melee", m)
		// })

		// html.find("#add-skill").on("click", ev => {
		// 	ev.preventDefault()
		// 	let r = new StaticSkill()
		// 	r.relativelevel = "-"
		// 	this._addToList("skills", r)
		// })

		// html.find("#add-spell").on("click", ev => {
		// 	ev.preventDefault()
		// 	let r = new StaticSpell()
		// 	this._addToList("spells", r)
		// })

		// html.find("#add-ads").on("click", ev => {
		// 	ev.preventDefault()
		// 	let r = new StaticAdvantage()
		// 	this._addToList("ads", r)
		// })

		// html.find("textarea").on("drop", this.dropFoundryLinks)
		// html.find("input").on("drop", this.dropFoundryLinks)

		// html.find(".itemdraggable").each((_, li) => {
		// 	li.setAttribute("draggable", "true")
		// 	li.addEventListener("dragstart", ev => {
		// 		let img = new Image()
		// 		img.src = this.item.img || ""
		// 		const w = 50
		// 		const h = 50
		// 		const preview = DragDrop.createDragImage(img, w, h)
		// 		ev.dataTransfer?.setDragImage(preview, 0, 0)
		// 		return ev.dataTransfer?.setData(
		// 			"text/plain",
		// 			JSON.stringify({
		// 				type: "Item",
		// 				id: this.item.id,
		// 				pack: this.item.pack,
		// 				data: this.item.data,
		// 			})
		// 		)
		// 	})
		// })
		html.find(".deprecation a").on("click", event => {
			event.preventDefault()
			this.item.setFlag(SYSTEM_NAME, ItemFlags.Deprecation, true)
		})

		html.find(".item").on("click", event => this._openPopout(event))
	}

	async _getItemContextMenu(event: JQuery.ContextMenuEvent, html: JQuery<HTMLElement>) {
		event.preventDefault()
		const type = $(event.currentTarget).parent(".item-list")[0].id as StaticPopoutType
		const id = $(event.currentTarget).data("item-id")
		const item = this.item.system[type][id]
		if (!item) return
		const ctx = new ContextMenu(html, ".menu", [])
		ctx.menuItems.push({
			name: LocalizeGURPS.translations.gurps.context.delete,
			icon: "<i class='gcs-trash'></i>",
			callback: () => {
				return Static.removeKey(this.item, `system.${type}.${id}`)
			},
		})
		await ctx.render($(event.currentTarget))
	}

	private async _getAddItemMenu(event: JQuery.ContextMenuEvent, html: JQuery<HTMLElement>) {
		event.preventDefault()
		const element = $(event.currentTarget)
		const type = element.parent(".item-list")[0].id
		const ctx = new ContextMenu(html, ".menu", [])
		ctx.menuItems = (function (self: StaticItemSheet): ContextMenuEntry[] {
			switch (type) {
				case StaticPopoutType.Melee:
					return [
						{
							name: LocalizeGURPS.translations.gurps.context.new_melee_weapon,
							icon: "<i class='gcs-melee'></i>",
							callback: () => self._newItem(StaticPopoutType.Melee, StaticItem[ItemType.MeleeWeapon]),
						},
					]
				case StaticPopoutType.Ranged:
					return [
						{
							name: LocalizeGURPS.translations.gurps.context.new_ranged_weapon,
							icon: "<i class='gcs-ranged'></i>",
							callback: () => self._newItem(StaticPopoutType.Ranged, StaticItem[ItemType.RangedWeapon]),
						},
					]
				case StaticPopoutType.Spell:
					return [
						{
							name: LocalizeGURPS.translations.gurps.context.new_spell,
							icon: "<i class='gcs-spell'></i>",
							callback: () => self._newItem(StaticPopoutType.Spell, StaticItem[ItemType.Spell]),
						},
					]
				case StaticPopoutType.Trait:
					return [
						{
							name: LocalizeGURPS.translations.gurps.context.new_trait,
							icon: "<i class='gcs-trait'></i>",
							callback: () => self._newItem(StaticPopoutType.Trait, StaticItem[ItemType.Trait]),
						},
					]
				case StaticPopoutType.Skill:
					return [
						{
							name: LocalizeGURPS.translations.gurps.context.new_skill,
							icon: "<i class='gcs-skill'></i>",
							callback: () => self._newItem(StaticPopoutType.Skill, StaticItem[ItemType.Skill]),
						},
					]
				default:
					return []
			}
		})(this)
		await ctx.render(element)
	}

	private _newItem(key: StaticPopoutType, itemConstructor: ConstructorOf<_BaseComponent>) {
		const item = new itemConstructor()
		const list = this.object.system[key]
		const id = Static.put(list, item)
		this.object.update({ [`system.${key}`]: list })
		const sheet = new StaticPopout(this.object, key, id)
		sheet.render(true)
		return this.render()
	}

	private _openPopout(event: JQuery.ClickEvent) {
		event.preventDefault()
		const key = $(event.currentTarget).parent(".item-list").attr("id") as StaticPopoutType
		const id = $(event.currentTarget).data("item-id") as string
		if (!id) return
		const sheet = new StaticPopout(this.object, key, id)
		sheet.render(true)
		return this.render()
	}

	// dropFoundryLinks(ev: any) {
	// 	if (ev.originalEvent) ev = ev.originalEvent
	// 	let dragData = JSON.parse(ev.dataTransfer.getData("text/plain"))
	// 	let n
	// 	if (dragData.type === "JournalEntry") {
	// 		n = game.journal?.get(dragData.id)?.name
	// 	}
	// 	if (dragData.type === "Actor") {
	// 		n = game.actors?.get(dragData.id)?.name
	// 	}
	// 	if (dragData.type === "RollTable") {
	// 		n = game.tables?.get(dragData.id)?.name
	// 	}
	// 	if (dragData.type === "Item") {
	// 		n = game.items?.get(dragData.id)?.name
	// 	}
	// 	if (n) {
	// 		let add = ` [${dragData.type}[${dragData.id}]{${n}}]`
	// 		$(ev.currentTarget).val($(ev.currentTarget).val() + add)
	// 	}
	// }

	// async _deleteKey(ev: any) {
	// 	let key = ev.currentTarget.getAttribute("name")
	// 	let path = ev.currentTarget.getAttribute("data-path")
	// 	Static.removeKey(this.item, `${path}.${key}`)
	// }

	// async _onDrop(event: any) {
	// 	let dragData = DnD.getDragData(event, DnD.TEXT_PLAIN)
	// 	if (!["melee", "ranged", "skills", "spells", "ads", "equipment"].includes(dragData.type)) return
	// 	let srcActor = game.actors?.get(dragData.actorid)
	// 	let srcData = getProperty(srcActor!, dragData.key)
	// 	srcData.contains = {} // Don't include any contained/collapsed items from source
	// 	srcData.collapsed = {}
	// 	if (dragData.type === "equipment") {
	// 		this.item.update({
	// 			name: srcData.name,
	// 			"system.eqt": srcData,
	// 		})
	// 		return
	// 	}
	// 	this._addToList(dragData.type, srcData)
	// }

	_addToList(key: keyof StaticItemSystemData, data: any) {
		let list = this.item.system[key] || {}
		Static.put(list, data)
		this.item.update({ [`system.${key}`]: list })
	}

	// async close(): Promise<void> {
	// 	super.close()
	// 	if ((this.object as any).editingActor) (this.object as any).editingActor.updateItem(this.object)
	// }

	protected async _updateObject(event: Event, formData: Record<string, any>): Promise<unknown> {
		if (formData.name) formData["system.eqt.name"] = formData.name
		return super._updateObject(event, formData)
	}
}

// @ts-ignore
export interface StaticItemSheet {
	object: StaticItemGURPS
}
