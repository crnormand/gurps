import { ActorGURPS } from "@actor";
import { ContainerGURPS, ItemGURPS } from "@item";
import { ItemDataBaseProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { PropertiesToSource } from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import { SYSTEM_NAME } from "@module/settings";

export class ActorSheetGURPS extends ActorSheet {
	static override get defaultOptions(): ActorSheet.Options {
		const options = ActorSheet.defaultOptions;
		mergeObject(options, {
			classes: ["gcs", "actor"],
		});
		return options;
	}

	// DragData handling
	protected override async _onDropItem(event: DragEvent, data: ActorSheet.DropData.Item): Promise<unknown> {
		// Remove Drag Markers
		$(".drop-over").removeClass("drop-over");

		if (!this.actor.isOwner) return false;

		// Const item = await (BaseItemGURPS as any).implementation.fromDropData(data);
		const item = await (Item.implementation as any).fromDropData(data);
		const itemData = item.toObject();

		// Handle item sorting within the same Actor
		if (this.actor.uuid === item.actor?.uuid) return this._onSortItem(event, itemData);

		return this._onDropItemCreate(itemData);
	}

	protected override async _onDragStart(event: DragEvent): Promise<void> {
		const list = event.currentTarget;
		// If (event.target.classList.contains("contents-link")) return;

		let dragData: any;

		// Owned Items
		if ($(list as HTMLElement).data("uuid")) {
			// If ((list as HTMLElement).dataset.itemI) {
			const itemData = duplicate((await fromUuid($(list as HTMLElement).data("uuid"))) as Item | Actor) as any;
			delete itemData._id;
			dragData = {
				type: "Item",
				data: itemData,
			};

			// Create custom drag image
			const dragImage = document.createElement("div");
			dragImage.innerHTML = await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/drag-image.hbs`, {
				name: `${itemData?.name}`,
				type: `${itemData?.type.replace("_container", "").replaceAll("_", "-")}`,
			});
			dragImage.id = "drag-ghost";
			document.body.querySelectorAll("#drag-ghost").forEach(e => e.remove());
			document.body.appendChild(dragImage);
			const height = (document.body.querySelector("#drag-ghost") as HTMLElement).offsetHeight;
			event.dataTransfer?.setDragImage(dragImage, 0, height / 2);
		}

		// Active Effect
		if ((list as HTMLElement).dataset.effectId) {
			const effect = this.actor.effects.get((list as HTMLElement).dataset.effectId!);
			dragData = (effect as any)?.toDragData();
		}

		// Set data transfer
		event.dataTransfer?.setData("text/plain", JSON.stringify(dragData));
	}

	protected override async _onSortItem(
		event: DragEvent,
		itemData: PropertiesToSource<ItemDataBaseProperties>
	): Promise<Item[]> {
		const source = this.actor.deepItems.get(itemData._id!);
		const dropTarget = $(event.target!).closest("[data-item-id]");
		const target = this.actor.deepItems.get(dropTarget.data("item-id"));
		if (!target) return [];
		const parent = target?.parent;
		const siblings = (target!.parent!.items as Collection<ItemGURPS>).filter(
			i => i._id !== source!._id && source!.sameSection(i)
		);

		if (target && !source?.sameSection(target)) return [];

		const sortUpdates = SortingHelpers.performIntegerSort(source, {
			target: target,
			siblings,
		});
		const updateData = sortUpdates.map(u => {
			const update = u.update;
			(update as any)._id = u.target!._id;
			return update;
		});

		if (source && target && source.parent !== target.parent) {
			if (source instanceof ContainerGURPS && target.parents.includes(source)) return [];
			await source.parent!.deleteEmbeddedDocuments("Item", [source!._id!], { render: false });
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
			);
		}
		return parent!.updateEmbeddedDocuments("Item", updateData) as unknown as Item[];
	}
}

export interface ActorSheetGURPS extends ActorSheet {
	object: ActorGURPS;
}
