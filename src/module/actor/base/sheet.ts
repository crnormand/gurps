import { ItemType, SYSTEM_NAME } from "@module/data"
import { DamageChat } from "@module/damage_calculator/damage_chat_message"
import { DnD } from "@util/drag_drop"
import { ActorGURPS } from "@module/config"
import { PropertiesToSource } from "types/types/helperTypes"
import { ItemDataBaseProperties } from "types/foundry/common/data/data.mjs/itemData"
import { LastActor } from "@util"
import { ContainerGURPS, ItemFlags } from "@item"

type DispatchFunctions = Record<string, (arg: any) => void>

export class ActorSheetGURPS extends ActorSheet {
	readonly dropDispatch: DispatchFunctions = {
		[DamageChat.TYPE]: this.actor.handleDamageDrop.bind(this.actor),
	}

	static override get defaultOptions(): ActorSheet.Options {
		const options = ActorSheet.defaultOptions
		mergeObject(options, {
			classes: ["gurps", "actor"],
		})
		return options
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.on("click", () => LastActor.set(this.actor))
	}

	protected override _onDrop(event: DragEvent): void {
		if (!event?.dataTransfer) return

		let dragData = DnD.getDragData(event, DnD.TEXT_PLAIN)

		if (this.dropDispatch[dragData.type]) this.dropDispatch[dragData.type](dragData.payload)

		super._onDrop(event)
	}

	async emulateItemDrop(data: any) {
		const item = (await fromUuid(data.uuid)) as Item
		if (!item) return
		return this._onDropItemCreate({ ...item.toObject() } as any)
	}

	// DragData handling
	protected override async _onDropItem(
		event: DragEvent,
		data: ActorSheet.DropData.Item & { uuid: string }
	): Promise<unknown> {
		const top = Boolean($(".border-top").length)
		const inContainer = Boolean($(".border-in").length)

		$(".border-bottom").removeClass("border-bottom")
		$(".border-top").removeClass("border-top")
		$(".border-in").removeClass("border-in")

		// Return super._onDropItem(event, data)

		if (!this.actor.isOwner) return false

		// let item: Item
		// if (data._uuid) {
		const importData = {
			type: data.type,
			uuid: data.uuid,
		}
		const item = await (Item.implementation as any).fromDropData(importData)
		// } else {
		// item = await (Item.implementation as any).fromDropData(data)
		// }
		const itemData = item.toObject()

		// Handle item sorting within the same Actor
		if (this.actor.uuid === item.actor?.uuid) {
			return this._onSortItem(event, itemData, { top: top, in: inContainer })
		}

		let id: string | null = null

		let dropTarget = $(event.target!).closest(".desc[data-item-id]")
		id = dropTarget?.data("item-id") ?? null
		if (!id || inContainer) {
			await this._onDropNestedItemCreate([item], { id: id })
			return this.render()
		}

		const targetItem = this.actor.items.get(id) as any

		id = (this.actor.items.get(id) as any)?.container.id

		const newItems = await this._onDropNestedItemCreate([item], { id: id })

		const sortUpdates = SortingHelpers.performIntegerSort(newItems[0], {
			target: targetItem,
			siblings: targetItem.container.items.contents,
			sortBefore: top,
		}).map(u => {
			return {
				...u.update,
				_id: u.target._id,
			}
		})
		return this.actor?.updateEmbeddedDocuments("Item", sortUpdates)
	}

	async _onDropNestedItemCreate(items: Item[], context: { id: string | null } = { id: null }): Promise<Item[]> {
		const itemData = items.map(e =>
			mergeObject(e.toObject(), { [`flags.${SYSTEM_NAME}.${ItemFlags.Container}`]: context.id })
		)

		const newItems = await this.actor.createEmbeddedDocuments("Item", itemData, {
			render: false,
			temporary: false,
		})

		let totalItems = newItems
		for (let i = 0; i < items.length; i++) {
			if (items[i] instanceof ContainerGURPS && (items[i] as ContainerGURPS).items.size) {
				const parent = items[i] as ContainerGURPS
				const childItems = await this._onDropNestedItemCreate(parent.items.contents, { id: newItems[i].id })
				totalItems = totalItems.concat(childItems)
			}
		}
		return totalItems
	}

	protected override async _onDragStart(event: DragEvent): Promise<void> {
		const list = event.currentTarget
		// If (event.target.classList.contains("contents-link")) return;

		let itemData: any
		let dragData: any

		// Owned Items
		if ($(list as HTMLElement).data("item-id")) {
			const id = $(list as HTMLElement).data("item-id")
			const item = this.actor.items.get(id) ?? null
			dragData = {
				type: "Item",
				uuid: item?.uuid,
			}

			// Create custom drag image
			const dragImage = document.createElement("div")
			dragImage.innerHTML = await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/drag-image.hbs`, {
				name: `${itemData?.name}`,
				type: `${itemData?.type.replace("_container", "").replaceAll("_", "-")}`,
			})
			dragImage.id = "drag-ghost"
			document.body.querySelectorAll("#drag-ghost").forEach(e => e.remove())
			document.body.appendChild(dragImage)
			const height = (document.body.querySelector("#drag-ghost") as HTMLElement).offsetHeight
			event.dataTransfer?.setDragImage(dragImage, 0, height / 2)
		}

		// Active Effect
		if ((list as HTMLElement).dataset.effectId) {
			const effect = this.actor.effects.get((list as HTMLElement).dataset.effectId!)
			dragData = (effect as any)?.toDragData()
		}

		// Set data transfer
		event.dataTransfer?.setData("text/plain", JSON.stringify(dragData))
	}

	protected override async _onSortItem(
		event: DragEvent,
		itemData: PropertiesToSource<ItemDataBaseProperties>,
		options: { top: boolean; in: boolean } = { top: false, in: false }
	): Promise<Item[]> {
		const source: any = this.actor.items.get(itemData._id!)
		let dropTarget = $(event.target!).closest(".desc[data-item-id]")
		const id = dropTarget?.data("item-id")
		let target: any = this.actor.items.get(id)
		if (!target) return []
		let parent: any = target?.container
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
		}) as { _id: string; sort: number; [key: string]: any }[]

		if (source && source.container !== parent) {
			const id = updateData.findIndex(e => (e._id = source._id))
			if (source.items && parents.includes(source)) return []
			updateData[id][`flags.${SYSTEM_NAME}.${ItemFlags.Container}`] = parent instanceof Item ? parent.id : null
			if ([ItemType.Equipment, ItemType.EquipmentContainer].includes(source.type)) {
				if (dropTarget.hasClass("other")) updateData[id]["system.other"] = true
				else updateData[id]["system.other"] = false
			}
		}
		return this.actor!.updateEmbeddedDocuments("Item", updateData) as unknown as Item[]
	}

	protected _getHeaderButtons(): Application.HeaderButton[] {
		const all_buttons = super._getHeaderButtons()
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-circled-x"
		return all_buttons
	}
}

export interface ActorSheetGURPS extends ActorSheet {
	object: ActorGURPS
}
