import { ActorGURPS, BaseActorGURPS } from "@actor"
import { ItemDataBaseProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData"
import { PropertiesToSource } from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes"
import { SYSTEM_NAME } from "@module/data"
import { DamageChat } from "@module/damage_calculator/damage_chat_message"
import { DnD } from "@util/drag_drop"

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
	}

	protected override _onDrop(event: DragEvent): void {
		if (!event?.dataTransfer) return

		let dragData = DnD.getDragData(event, DnD.TEXT_PLAIN)

		if (this.dropDispatch[dragData.type])
			this.dropDispatch[dragData.type](dragData.payload)

		super._onDrop(event)
	}

	// DragData handling
	protected override async _onDropItem(
		event: DragEvent,
		data: ActorSheet.DropData.Item & { actor: BaseActorGURPS; _uuid?: string }
	): Promise<unknown> {
		const element = $(event.currentTarget!)
		const widthAcross = (event.pageX! - element.offset()!.left) / element.width()!
		const top = Boolean($(".border-top").length)
		$(".border-bottom").removeClass("border-bottom")
		$(".border-top").removeClass("border-top")

		if (!this.actor.isOwner) return false

		// Const item = await (BaseItemGURPS as any).implementation.fromDropData(data);
		let item: Item
		if (data._uuid) {
			const importData = {
				type: data.type,
				uuid: data._uuid,
			}
			item = await (Item.implementation as any).fromDropData(importData)
		} else {
			item = await (Item.implementation as any).fromDropData(data)
		}
		const itemData = item.toObject()

		// Handle item sorting within the same Actor
		if (this.actor.uuid === item.actor?.uuid)
			return this._onSortItem(event, itemData, { top: top, in: widthAcross > 0.3 })

		return this._onDropItemCreate(itemData)
	}

	protected override async _onDragStart(event: DragEvent): Promise<void> {
		const list = event.currentTarget
		// If (event.target.classList.contains("contents-link")) return;

		let itemData: any
		let dragData: any

		// Owned Items
		if ($(list as HTMLElement).data("uuid")) {
			const uuid = $(list as HTMLElement).data("uuid")
			itemData = (await fromUuid(uuid))?.toObject()
			itemData._id = null
			// Adding both uuid and itemData here. Foundry default functions don't read _uuid, but they do read uuid
			// this prevents Foundry from attempting to get the object from uuid, which would cause it to complain
			// e.g. in cases where an item inside a container is dragged into the items tab
			dragData = {
				type: "Item",
				_uuid: uuid,
				data: itemData,
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
		// If (dragData.type === "Item") {
		// 	await this.actor.deepItems.get(itemData._id)?.delete()
		// }
	}

	protected override async _onSortItem(
		event: DragEvent,
		itemData: PropertiesToSource<ItemDataBaseProperties>,
		options: { top: boolean; in: boolean } = { top: false, in: false }
	): Promise<Item[]> {
		const source: any = this.actor.deepItems.get(itemData._id!)
		let dropTarget = $(event.target!).closest(".desc[data-uuid]")
		if (!options?.top) dropTarget = dropTarget.nextAll(".desc[data-uuid]").first()
		let target: any = this.actor.deepItems.get(dropTarget.data("uuid").split(".").at(-1))
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
			siblings,
		})
		const updateData = sortUpdates.map(u => {
			const update = u.update
			;(update as any)._id = u.target!._id
			return update
		})

		if (source && source.parent !== parent) {
			if (source.items && parents.includes(source)) return []
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
