import { BaseActorGURPS } from "@actor"
import { ItemDataGURPS } from "@module/config"
import { ItemType, SYSTEM_NAME } from "@module/data"
import { Context, DocumentModificationOptions } from "types/foundry/common/abstract/document.mjs"
import { BaseUser } from "types/foundry/common/documents.mjs"
import { BaseItemSourceGURPS, ItemConstructionContextGURPS } from "./data"

class BaseItemGURPS extends Item {
	// @ts-ignore
	parent: CharacterGURPS | ContainerGURPS | null

	constructor(data: ItemDataGURPS | any, context: Context<Actor> & ItemConstructionContextGURPS = {}) {
		if (context.gurps?.ready) {
			super(data, context)
		} else {
			mergeObject(context, {
				gurps: {
					ready: true,
				},
			})
			const ItemConstructor = CONFIG.GURPS.Item.documentClasses[data.type as ItemType]
			if (ItemConstructor) return new ItemConstructor(data, context)
			throw Error(`Invalid Item Type "${data.type}"`)
		}
	}

	override delete(context?: DocumentModificationContext | undefined): Promise<any> {
		if (!(this.parent instanceof Item)) return super.delete(context)
		return this.parent.deleteEmbeddedDocuments("Item", [this.id!])
	}

	static override async createDialog(
		data: { folder?: string } = {},
		options: Partial<FormApplicationOptions> = {}
	): Promise<any | undefined> {
		const original = game.system.documentTypes.Item
		game.system.documentTypes.Item = original.filter(
			(itemType: string) => ![ItemType.Condition].includes(itemType as any)
		)
		options = { ...options, classes: [...(options.classes ?? []), "dialog-item-create"] }
		const newItem = super.createDialog(data, options) as Promise<BaseItemGURPS | undefined>
		game.system.documentTypes.Item = original
		return newItem
	}

	static override async updateDocuments(
		updates: any[],
		context: DocumentModificationContext & { options: any }
	): Promise<any[]> {
		if (!(context.parent instanceof Item)) return super.updateDocuments(updates, context)
		return context.parent.updateEmbeddedDocuments("Item", updates, context.options)
	}

	protected async _preCreate(
		data: ItemDataGURPS,
		options: DocumentModificationOptions,
		user: BaseUser
	): Promise<void> {
		let type = data.type.replace("_container", "")
		if (type === ItemType.Technique) type = ItemType.Skill
		else if (type === ItemType.RitualMagicSpell) type = ItemType.Spell
		else if (type === ItemType.Equipment) type = "equipment"
		else if (type === ItemType.LegacyEquipment) type = "legacy_equipment"
		// TODO: remove any
		if (this._source.img === (foundry.documents.BaseItem as any).DEFAULT_ICON)
			this._source.img = data.img = `systems/${SYSTEM_NAME}/assets/icons/${type}.svg`
		await super._preCreate(data, options, user)
	}

	get actor(): BaseActorGURPS | null {
		if (this.parent) return this.parent instanceof Actor ? this.parent : this.parent.actor
		return null
	}

	get parents(): Array<any> {
		if (!this.parent && !this.compendium) return []
		const grandparents = this.parent instanceof BaseItemGURPS ? this.parent.parents : []
		if (!this.parent) return [this.compendium, ...grandparents]
		return [this.parent, ...grandparents]
	}

	get parentCount(): number {
		let i = 0
		let p: any = this.parent
		while (p) {
			i++
			p = p.parent
		}
		return i
	}

	prepareData(): void {
		super.prepareData()
	}
}

interface BaseItemGURPS extends Item {
	system: any
	_id: string
	_source: BaseItemSourceGURPS
}

export { BaseItemGURPS }
