import { ItemSheetGURPS } from "@item/base/sheet";
import { ItemGURPS } from "@item";
import { TraitModifierGURPS } from "@item/trait_modifier";
import { ItemDataBaseProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { PropertiesToSource } from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import { SYSTEM_NAME } from "@module/settings";
import { ContainerGURPS } from ".";

export class ContainerSheetGURPS extends ItemSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		return mergeObject(ItemSheetGURPS.defaultOptions, {
			template: `/systems/${SYSTEM_NAME}/templates/item/container-sheet.hbs`,
			dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
		});
	}

	get items() {
		return deepClone(
			(this.item as ContainerGURPS).items
				.map(item => item as Item)
				// @ts-ignore sort not in Item type yet
				.sort((a: Item, b: Item) => (a.sort || 0) - (b.sort || 0))
		);
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html);
		html.find(".dropdown-toggle").on("click", event => this._onCollapseToggle(event));
		html.find(".enabled").on("click", event => this._onEnabledToggle(event));
		// Html.find(".item-list").on("dragend", event => this._onDrop(event));
	}

	protected override async _onDragStart(event: DragEvent): Promise<void> {
		const list = event.currentTarget;
		// If (event.target.classList.contains("contents-link")) return;

		let dragData: any;
		// Const dragData: any = {
		// 	actorId: this.actor.id,
		// 	sceneId: this.actor.isToken ? canvas?.scene?.id : null,
		// 	tokenId: this.actor.isToken ? this.actor.token?.id : null,
		// 	pack: this.actor?.pack,
		// };

		// Owned Items
		if ((list as HTMLElement).dataset.itemId) {
			const item = (this.item as ContainerGURPS).deepItems.get((list as HTMLElement).dataset.itemId!);
			dragData = (item as any)?.toDragData();

			// Create custom drag image
			const dragImage = document.createElement("div");
			dragImage.innerHTML = await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/drag-image.hbs`, {
				name: `${item?.name}`,
				type: `${item?.type.replace("_container", "").replaceAll("_", "-")}`,
			});
			dragImage.id = "drag-ghost";
			document.body.querySelectorAll("#drag-ghost").forEach(e => e.remove());
			document.body.appendChild(dragImage);
			const height = (document.body.querySelector("#drag-ghost") as HTMLElement).offsetHeight;
			event.dataTransfer?.setDragImage(dragImage, 0, height / 2);
		}

		// Active Effect
		if ((list as HTMLElement).dataset.effectId) {
			const effect = (this.item as ContainerGURPS).effects.get((list as HTMLElement).dataset.effectId!);
			dragData = (effect as any)?.toDragData();
		}

		// Set data transfer
		event.dataTransfer?.setData("text/plain", JSON.stringify(dragData));
	}

	protected _onDrop(event: DragEvent): any {
		event.preventDefault();
		event.stopPropagation();
		let data;
		try {
			data = JSON.parse(event.dataTransfer?.getData("text/plain") ?? "");
		} catch (err) {
			console.log(event.dataTransfer?.getData("text/plain"));
			console.log(err);
			return false;
		}

		switch (data.type) {
			case "Item":
				return this._onDropItem(event, data as ActorSheet.DropData.Item);
		}
	}

	// DragData handling
	protected async _onDropItem(event: DragEvent, data: ActorSheet.DropData.Item): Promise<unknown> {
		// Remove Drag Markers
		$(".drop-over").removeClass("drop-over");

		if (!this.item.isOwner) return false;

		// Const item = await (BaseItemGURPS as any).implementation.fromDropData(data);
		const item = await (Item.implementation as any).fromDropData(data);
		const itemData = item.toObject();

		// Handle item sorting within the same Actor
		if (this.item.uuid === item.parent?.uuid) return this._onSortItem(event, itemData);

		return this._onDropItemCreate(itemData);
	}

	async _onDropItemCreate(itemData: any[]) {
		itemData = itemData instanceof Array ? itemData : [itemData];
		return (this.item as ContainerGURPS).createEmbeddedDocuments("Item", itemData, { temporary: false });
	}

	protected async _onSortItem(
		event: DragEvent,
		itemData: PropertiesToSource<ItemDataBaseProperties>
	): Promise<Item[]> {
		const source = (this.item as ContainerGURPS).deepItems.get(itemData._id!);
		const dropTarget = $(event.target!).closest("[data-item-id]");
		const target = (this.item as ContainerGURPS).deepItems.get(dropTarget.data("item-id"));
		if (!target) return [];
		const parent = target?.parent;
		const siblings = (target!.parent!.items as Collection<ItemGURPS>).filter(i => i._id !== source!._id);

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
			await source!.parent!.deleteEmbeddedDocuments("Item", [source!._id!], { render: false });
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

	protected async _onCollapseToggle(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault();
		const uuid = $(event.currentTarget).data("uuid");
		const item = (await fromUuid(uuid)) as ItemGURPS;
		const open = !!$(event.currentTarget).attr("class")?.includes("closed");
		item?.update({ "system.open": open });
	}

	protected async _onEnabledToggle(event: JQuery.ClickEvent) {
		event.preventDefault();
		const uuid = $(event.currentTarget).data("uuid");
		const item = (await fromUuid(uuid)) as ItemGURPS;
		if (item?.type.includes("container")) return;
		await item?.update({
			"system.disabled": (item as TraitModifierGURPS).enabled,
		});
		return this.render();
	}
}
