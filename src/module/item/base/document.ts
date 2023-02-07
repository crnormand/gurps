import { ItemDataGURPS, ItemType } from "@item/data"
import { SYSTEM_NAME } from "@module/data"
import { Context, DocumentModificationOptions } from "types/foundry/common/abstract/document.mjs"
import { BaseUser } from "types/foundry/common/documents.mjs"
import { BaseItemSourceGURPS, ItemConstructionContextGURPS } from "./data"

// @ts-ignore
class BaseItemGURPS extends Item {
	constructor(data: ItemDataGURPS | any, context: Context<Actor> & ItemConstructionContextGURPS = {}) {
		if (context.gurps?.ready) {
			super(data, context)
		} else {
			mergeObject(context, {
				gurps: {
					ready: true,
				},
			})
			const ItemConstructor = (CONFIG as any).GURPS.Item.documentClasses[data.type as ItemType]
			return ItemConstructor ? new ItemConstructor(data, context) : new BaseItemGURPS(data, context)
		}
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
}

// @ts-ignore
interface BaseItemGURPS extends Item {
	// System: ItemSystemData
	// Temporary
	_id: string
	_source: BaseItemSourceGURPS
}

export { BaseItemGURPS }
