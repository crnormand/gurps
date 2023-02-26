import { ItemType, SYSTEM_NAME } from "@module/data"
import { DnD } from "@util/drag_drop"
import { ItemGURPS } from "@module/config"
import { PropertiesToSource } from "types/types/helperTypes"
import { ItemDataBaseProperties } from "types/foundry/common/data/data.mjs/itemData"
import { ItemSheetGURPS } from "@item/base"
import { TraitModifierGURPS } from "@item/trait_modifier"
import { ContainerGURPS } from "./document"

export class ContainerSheetGURPS extends ItemSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		return mergeObject(ItemSheetGURPS.defaultOptions, {
			template: `/systems/${SYSTEM_NAME}/templates/item/container-sheet.hbs`,
			dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
		})
	}

	get items() {
		return deepClone(
			(this.item as ContainerGURPS).items
				.map(item => item as Item)
				// @ts-ignore sort not in Item type yet
				.sort((a: Item, b: Item) => (a.sort || 0) - (b.sort || 0))
		)
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find(".dropdown-toggle").on("click", event => this._onCollapseToggle(event))
		html.find(".enabled").on("click", event => this._onEnabledToggle(event))
	}

	protected override async _onDragStart(event: DragEvent): Promise<void> {
		const list = event.currentTarget

		let dragData: any

		// Owned Items
		if ((list as HTMLElement).dataset.itemId) {
			const item = (this.item as ContainerGURPS).deepItems.get((list as HTMLElement).dataset.itemId!)
			dragData = (item as any)?.toDragData()

			// Create custom drag image
			const dragImage = document.createElement("div")
			dragImage.innerHTML = await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/drag-image.hbs`, {
				name: `${item?.name}`,
				type: `${item?.type.replace("_container", "").replaceAll("_", "-")}`,
			})
			dragImage.id = "drag-ghost"
			document.body.querySelectorAll("#drag-ghost").forEach(e => e.remove())
			document.body.appendChild(dragImage)
			const height = (document.body.querySelector("#drag-ghost") as HTMLElement).offsetHeight
			event.dataTransfer?.setDragImage(dragImage, 0, height / 2)
		}

		// Active Effect
		if ((list as HTMLElement).dataset.effectId) {
			const effect = (this.item as ContainerGURPS).effects.get((list as HTMLElement).dataset.effectId!)
			dragData = (effect as any)?.toDragData()
		}

		// Set data transfer
		event.dataTransfer?.setData("text/plain", JSON.stringify(dragData))
	}

	getData(options?: Partial<DocumentSheetOptions<Item>>): any {
		const items = this.items
		const sheetData = {
			...super.getData(options),
			...{
				items: items,
				meleeWeapons: items.filter(e => [ItemType.MeleeWeapon].includes(e.type as ItemType)),
				rangedWeapons: items.filter(e => [ItemType.RangedWeapon].includes(e.type as ItemType)),
			},
		}
		return sheetData
	}

	protected _onDrop(event: DragEvent): any {
		event.preventDefault()
		event.stopPropagation()
		let data
		try {
			data = DnD.getDragData(event, DnD.TEXT_PLAIN)
		} catch (err) {
			console.error(event.dataTransfer?.getData("text/plain"))
			console.error(err)
			return false
		}

		switch (data.type) {
			case "Item":
				return this._onDropItem(event, data as ActorSheet.DropData.Item)
		}
	}

	// DragData handling
	protected async _onDropItem(event: DragEvent, data: ActorSheet.DropData.Item): Promise<unknown> {
		const top = Boolean($(".border-top").length)
		const inContainer = Boolean($(".border-in").length)

		$(".border-bottom").removeClass("border-bottom")
		$(".border-top").removeClass("border-top")
		$(".border-in").removeClass("border-in")

		if (!this.item.isOwner) return false

		// Const item = await (BaseItemGURPS as any).implementation.fromDropData(data);
		const item = await (Item.implementation as any).fromDropData(data)
		const itemData = { ...item.toObject(), uuid: item.uuid }

		// Handle item sorting within the same Actor
		if (this.item.uuid === item.parent?.uuid)
			return this._onSortItem(event, itemData, { top: top, in: inContainer })

		return this._onDropItemCreate(itemData)
	}

	async _onDropItemCreate(itemData: any[]) {
		itemData = itemData instanceof Array ? itemData : [itemData]
		return (this.item as ContainerGURPS).createEmbeddedDocuments("Item", itemData, { temporary: false })
	}

	protected async _onSortItem(
		event: DragEvent,
		itemData: PropertiesToSource<ItemDataBaseProperties> & { uuid: string },
		options: { top: boolean; in: boolean } = { top: false, in: false }
	): Promise<Item[]> {
		const source: any = this.object.deepItems.get(itemData.uuid)
		let dropTarget = $(event.target!).closest(".desc[data-uuid]")
		let target: any = this.object.deepItems.get(dropTarget?.data("uuid"))
		if (!target) return []
		let parent: any = target?.parent
		let parents = target?.parents
		if (options.in) {
			parent = target
			target = parent.children.contents[0] ?? null
		}
		const siblings = (parent!.items as Collection<Item>).filter(
			i => i.id !== source!.id && (source as any)!.sameSection(i)
		)
		if (target && !(source as any)?.sameSection(target)) return []

		const sortUpdates = SortingHelpers.performIntegerSort(source, {
			target: target,
			siblings: siblings,
			sortBefore: options.top,
		})
		const updateData = sortUpdates.map(u => {
			const update = u.update
			;(update as any)._id = u.target!._id
			return update
		})

		if (source && source.parent !== parent) {
			if (source.items && parents.includes(source)) return []
			console.log(source.name, "going in", parent.name)
			await source.parent!.deleteEmbeddedDocuments("Item", [source!._id!], { render: false })
			return parent?.createEmbeddedDocuments(
				"Item",
				[
					{
						name: source.name!,
						data: source.system,
						type: source.type,
						flags: source.flags,
						sort: updateData[0].sort,
					},
				],
				{ temporary: false }
			)
		}
		return parent!.updateEmbeddedDocuments("Item", updateData) as unknown as Item[]
	}

	protected async _onCollapseToggle(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()
		const uuid = $(event.currentTarget).data("uuid")
		const item = (await fromUuid(uuid)) as ItemGURPS
		const open = !!$(event.currentTarget).attr("class")?.includes("closed")
		item?.update({ "system.open": open })
	}

	protected async _onEnabledToggle(event: JQuery.ClickEvent) {
		event.preventDefault()
		const uuid = $(event.currentTarget).data("uuid")
		const item = (await fromUuid(uuid)) as ItemGURPS
		if (item?.type.includes("container")) return
		await item?.update({
			"system.disabled": (item as TraitModifierGURPS).enabled,
		})
		return this.render()
	}
}

export interface ContainerSheetGURPS extends ItemSheetGURPS {
	object: ContainerGURPS
}
