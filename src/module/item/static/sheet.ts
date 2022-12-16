import { StaticAdvantage, StaticMelee, StaticSkill, StaticSpell } from "@actor/static_character/components"
import { ItemSheetGURPS } from "@item/base/sheet"
import { Static } from "@util"
import { DnD } from "@util/drag_drop"
import { StaticItemGURPS } from "."
import { StaticItemSystemData } from "./data"

export class StaticItemSheet extends ItemSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["skill"]),
		})
		return options
	}

	getData(_options?: Partial<DocumentSheetOptions> | undefined) {
		const sheetData = super.getData()
		sheetData.data = this.item.system
		sheetData.system = this.item.system
		sheetData.data.eqt.f_count = this.item.system.eqt.count // Hack for Furnace module
		sheetData.name = this.item.name
		if (!this.item.system.globalid && !this.item.parent)
			this.item.update({ "system.globalid": this.item.id, _id: this.item.id })
		return sheetData
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find("#itemname").on("change", ev => {
			let nm = String($(ev.currentTarget).val)
			let commit = { "system.eqt.name": nm, name: nm }
			Static.recurseList(this.item.system.melee, (_e, k, _d) => {
				commit = { ...commit, ...{ [`sytem.melee.${k}.name`]: nm } }
			})
			Static.recurseList(this.item.system.ranged, (_e, k, _d) => {
				commit = { ...commit, ...{ [`system.melee.${k}.name`]: nm } }
			})
			this.item.update(commit)
		})

		html.find("#add-melee").on("click", ev => {
			ev.preventDefault()
			let m = new StaticMelee()
			m.name = this.item.name || ""
			this._addToList("melee", m)
		})

		html.find("#add-skill").on("click", ev => {
			ev.preventDefault()
			let r = new StaticSkill()
			r.relativelevel = "-"
			this._addToList("skills", r)
		})

		html.find("#add-spell").on("click", ev => {
			ev.preventDefault()
			let r = new StaticSpell()
			this._addToList("spells", r)
		})

		html.find("#add-ads").on("click", ev => {
			ev.preventDefault()
			let r = new StaticAdvantage()
			this._addToList("ads", r)
		})

		html.find("textarea").on("drop", this.dropFoundryLinks)
		html.find("input").on("drop", this.dropFoundryLinks)

		html.find(".itemdraggable").each((_, li) => {
			li.setAttribute("draggable", "true")
			li.addEventListener("dragstart", ev => {
				let img = new Image()
				img.src = this.item.img || ""
				const w = 50
				const h = 50
				const preview = DragDrop.createDragImage(img, w, h)
				ev.dataTransfer?.setDragImage(preview, 0, 0)
				return ev.dataTransfer?.setData(
					"text/plain",
					JSON.stringify({
						type: "Item",
						id: this.item.id,
						pack: this.item.pack,
						data: this.item.data,
					})
				)
			})
		})
	}

	dropFoundryLinks(ev: any) {
		if (ev.originalEvent) ev = ev.originalEvent
		let dragData = JSON.parse(ev.dataTransfer.getData("text/plain"))
		let n
		if (dragData.type === "JournalEntry") {
			n = (game as Game).journal?.get(dragData.id)?.name
		}
		if (dragData.type === "Actor") {
			n = (game as Game).actors?.get(dragData.id)?.name
		}
		if (dragData.type === "RollTable") {
			n = (game as Game).tables?.get(dragData.id)?.name
		}
		if (dragData.type === "Item") {
			n = (game as Game).items?.get(dragData.id)?.name
		}
		if (n) {
			let add = ` [${dragData.type}[${dragData.id}]{${n}}]`
			$(ev.currentTarget).val($(ev.currentTarget).val() + add)
		}
	}

	async _deleteKey(ev: any) {
		let key = ev.currentTarget.getAttribute("name")
		let path = ev.currentTarget.getAttribute("data-path")
		Static.removeKey(this.item, `${path}.${key}`)
	}

	async _onDrop(event: any) {
		let dragData = DnD.getDragData(event, DnD.TEXT_PLAIN)
		if (!["melee", "ranged", "skills", "spells", "ads", "equipment"].includes(dragData.type)) return
		let srcActor = (game as Game).actors?.get(dragData.actorid)
		let srcData = getProperty(srcActor!, dragData.key)
		srcData.contains = {} // Don't include any contained/collapsed items from source
		srcData.collapsed = {}
		if (dragData.type === "equipment") {
			this.item.update({
				name: srcData.name,
				"system.eqt": srcData,
			})
			return
		}
		this._addToList(dragData.type, srcData)
	}

	_addToList(key: keyof StaticItemSystemData, data: any) {
		let list = this.item.system[key] || {}
		Static.put(list, data)
		this.item.update({ [`system.${key}`]: list })
	}

	async close(): Promise<void> {
		super.close()
		this.item.update({ "system.eqt.name": this.item.name })
		if ((this.object as any).editingActor) (this.object as any).editingActor.updateItem(this.object)
	}

	// Protected _updateObject(event: Event, formData: any): Promise<unknown> {
	// 	const attribute = formData.attribute ?? (this.item as SkillGURPS).attribute
	// 	const difficulty = formData.difficulty ?? (this.item as SkillGURPS).difficulty
	// 	formData["system.difficulty"] = `${attribute}/${difficulty}`
	// 	delete formData.attribute
	// 	delete formData.difficulty
	// 	return super._updateObject(event, formData)
	// }
}

export interface StaticItemSheet {
	object: StaticItemGURPS
}
