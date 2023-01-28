import { BaseItemSourceGURPS, ItemSystemData } from "@item/base/data"
import { ItemType } from "@item/data"

export type StaticItemSource = BaseItemSourceGURPS<ItemType.LegacyEquipment, StaticItemSystemData>

// Export class StaticItemData extends BaseItemDataGURPS<StaticItemGURPS> {}

export interface StaticItemData extends Omit<StaticItemSource, "effects">, StaticItemSystemData {
	readonly type: StaticItemSource["type"]
	data: StaticItemSystemData

	readonly _source: StaticItemSource
}

export interface StaticItemSystemData extends ItemSystemData {
	eqt: {
		name: string
		notes: string
		pageref: string
		count: number
		weight: number
		cost: number
		location: string
		carried: boolean
		equipped: boolean
		techlevel: string
		categories: string
		legalityclass: string
		costsum: number
		weightsum: number
		uses: number
		maxuses: number
		parentuuid: string
		uuid: string
		itemid: string
		gloablid: string
		contains: any
		img: string | null
	}
	melee: any
	ranged: any
	ads: any
	skills: any
	spells: any
	bonuses: string
	equipped: boolean
	carried: boolean
	globalid: string
	uuid: string
}
