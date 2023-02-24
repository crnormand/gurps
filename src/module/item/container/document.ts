import { BaseItemGURPS, ItemConstructionContextGURPS } from "@item/base"
import { ContainerDataGURPS, ItemDataGURPS, ItemGURPS } from "@module/config"
import { ItemType, SYSTEM_NAME } from "@module/data"
import { AnyDocumentData } from "types/foundry/common/abstract/data.mjs"
import Document, { Context, Metadata } from "types/foundry/common/abstract/document.mjs"
import EmbeddedCollection from "types/foundry/common/abstract/embedded-collection.mjs"
import { DocumentConstructor } from "types/types/helperTypes"
import { BaseContainerSystemData } from "./data"

abstract class ContainerGURPS extends BaseItemGURPS {
	// Items?: EmbeddedCollection<ConfiguredDocumentClass<typeof BaseItemGURPS>, any>;
	items: foundry.utils.Collection<Item> = new Collection()

	constructor(data: ContainerDataGURPS, context: Context<Actor> & ItemConstructionContextGURPS = {}) {
		if (!data.flags?.[SYSTEM_NAME]?.contentsData) mergeObject(data, { [`flags.${SYSTEM_NAME}.contentsData`]: [] })
		super(data, context)
	}

	// Getters
	get deepItems(): Collection<Item> {
		const deepItems: Item[] = []
		if (this.items)
			for (const item of this.items) {
				deepItems.push(item)
				if (item instanceof ContainerGURPS) for (const i of item.deepItems) deepItems.push(i)
			}
		return new Collection(
			deepItems.map(e => {
				return [e.id!, e]
			})
		)
	}

	// Embedded Items
	get children(): Collection<ItemGURPS> {
		const childTypes = CONFIG.GURPS.Item.childTypes[this.type]
		return new Collection(
			this.items
				.filter(item => childTypes.includes(item.type))
				.map(item => {
					// Return [item.id!, item]
					return [item.uuid, item]
				})
		) as Collection<ItemGURPS>
	}

	get open(): boolean {
		return (this.system as any).open
	}

	async createEmbeddedDocuments(
		embeddedName: string,
		data: Array<{ name: string; type: string } & Record<string, unknown>>,
		context: DocumentModificationContext & any
	): Promise<Array<any>> {
		if (embeddedName !== "Item") return super.createEmbeddedDocuments(embeddedName, data, context)
		if (!Array.isArray(data)) data = [data]

		// Prevent creating embeded documents which this type of container shouldn't contain
		data = data.filter(e => CONFIG.GURPS.Item.allowedContents[this.type].includes(e.type))

		const currentItems: any[] = duplicate((this.getFlag(SYSTEM_NAME, "contentsData") as any[]) ?? [])
		const newItems = []

		if (data.length) {
			for (const itemData of data) {
				let theData = itemData
				theData._id = randomID()
				const theItem = new CONFIG.Item.documentClass(theData, { parent: this as any })
				theData = theItem.toJSON()
				console.log(theItem.id, theItem.uuid, theData._id)
				currentItems.push(theData)
				newItems.push(theItem)
			}
			if (this.parent)
				await this.parent.updateEmbeddedDocuments("Item", [
					{ _id: this.id, [`flags.${SYSTEM_NAME}.contentsData`]: currentItems },
				])
			else this.setCollection(currentItems)
		}
		return newItems
	}

	getEmbeddedDocument(
		embeddedName: string,
		id: string,
		options?: { strict?: boolean | undefined } | undefined
	): Document<any, any, Metadata<any>> | undefined {
		if (embeddedName !== "Item") return super.getEmbeddedDocument(embeddedName, id, options)
		return this.items.get(id)
	}

	async updateEmbeddedDocuments(
		embeddedName: string,
		updates: Record<string, unknown>[],
		context?: DocumentModificationContext | undefined
	): Promise<Document<any, any, Metadata<any>>[]> {
		if (embeddedName !== "Item") return super.updateEmbeddedDocuments(embeddedName, updates, context)
		const contained: any[] = (this.getFlag(SYSTEM_NAME, "contentsData") as any[]) ?? []
		if (!Array.isArray(updates)) updates = [updates]
		const updated: any[] = []
		const newContained = contained.map((existing: ItemGURPS) => {
			const theUpdate = updates.find(update => update._id === existing._id)
			if (theUpdate) {
				const newData = mergeObject(existing, theUpdate, {
					overwrite: true,
					insertKeys: true,
					insertValues: true,
					inplace: false,
				})
				// If (newData["system.prereqs.-=prereqs"]) delete newData["system.prereqs.-=prereqs"]
				// // Temporary hack to fix prereqs. will fix later
				// // TODO: fix later
				// if (Object.keys(theUpdate).includes("system.prereqs.-=prereqs"))
				// 	(newData.system as any).prereqs.prereqs = null
				updated.push(newData)
				return newData
			}
			return existing
		})

		if (updated.length > 0) {
			if (this.parent) {
				await this.parent.updateEmbeddedDocuments("Item", [
					{
						_id: this.id,
						[`flags.${SYSTEM_NAME}.contentsData`]: newContained,
					},
				])
			} else {
				await this.setCollection(newContained)
			}
		}
		return updated
	}

	async setCollection(contents: any): Promise<void> {
		this.update({
			[`flags.${SYSTEM_NAME}.contentsData`]: duplicate(contents),
		})
	}

	async deleteEmbeddedDocuments(
		embeddedName: string,
		ids: string[],
		context?: DocumentModificationContext | undefined
	): Promise<Document<any, any, Metadata<any>>[]> {
		if (embeddedName !== "Item") return super.deleteEmbeddedDocuments(embeddedName, ids, context)

		const containedItems: ItemGURPS[] = (this.getFlag(SYSTEM_NAME, "contentsData") as ItemGURPS[]) ?? []
		const newContainedItems = containedItems.filter(e => !ids.includes(e._id))
		const deletedItems = containedItems.filter(e => ids.includes(e.id!))

		if (this.parent) {
			await this.parent.updateEmbeddedDocuments("Item", [
				{
					_id: this.id,
					[`flags.${SYSTEM_NAME}.contentsData`]: newContainedItems,
				},
			])
		} else {
			await this.setCollection(newContainedItems)
		}
		return deletedItems
	}

	getEmbeddedCollection(embeddedName: string): EmbeddedCollection<DocumentConstructor, AnyDocumentData> {
		if (embeddedName === "Item") return this.items as any
		return super.getEmbeddedCollection(embeddedName)
	}

	prepareEmbeddedDocuments(): void {
		if (this.actor?.noPrepare) return
		super.prepareEmbeddedDocuments()
		const containedItems = (this.getFlag(SYSTEM_NAME, "contentsData") as ItemDataGURPS[]) ?? []
		const oldItems = this.items ?? new Collection()

		this.items = new Collection()
		for (const item of containedItems) {
			if (this.type === ItemType.EquipmentContainer && item.type === ItemType.Equipment) {
				item.system.other = (this.system as any).other
			}
			if (!oldItems.has(item._id!)) {
				const theItem = new CONFIG.Item.documentClass(item, {
					parent: this as any,
				})
				theItem.prepareData()
				this.items.set(item._id!, theItem)
			} else {
				const currentItem = oldItems.get(item._id!)!
				;(currentItem as any).name = item.name
				;(currentItem as any).flags = item.flags
				;(currentItem as any).system = item.system
				;(currentItem as any).img = item.img
				;(currentItem as any).sort = item.sort
				setProperty((currentItem as any)._source, "name", item.name)
				setProperty((currentItem as any)._source, "flags", item.flags)
				setProperty((currentItem as any)._source, "system", item.system)
				setProperty((currentItem as any)._source, "sort", item.sort)
				currentItem.prepareData()
				this.items.set(item._id!, currentItem)
				if (this.sheet?.rendered) {
					// @ts-ignore
					this.sheet.render(false, { action: "update" })
				}
			}
		}
	}
}

interface ContainerGURPS extends BaseItemGURPS {
	readonly system: BaseContainerSystemData
}

export { ContainerGURPS }
