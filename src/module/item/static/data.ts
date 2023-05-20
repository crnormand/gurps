import { StaticAdvantage, StaticEquipment, StaticMelee, StaticRanged, StaticSkill, StaticSpell } from "@actor/static_character/components"
import { BaseItemSourceGURPS } from "@item/base/data"
import { ItemType } from "@module/data"

export type StaticItemSource = BaseItemSourceGURPS<ItemType.LegacyEquipment, StaticItemSystemData>

// Export class StaticItemData extends BaseItemDataGURPS<StaticItemGURPS> {}

export interface StaticItemData extends Omit<StaticItemSource, "effects">, StaticItemSystemData {
	readonly type: StaticItemSource["type"]
	data: StaticItemSystemData

	readonly _source: StaticItemSource
}

export interface StaticItemSystemData {
	eqt: StaticEquipment
	// eqt: {
	// 	name: string
	// 	notes: string
	// 	pageref: string
	// 	count: number
	// 	weight: number
	// 	cost: number
	// 	location: string
	// 	carried: boolean
	// 	equipped: boolean
	// 	techlevel: string
	// 	categories: string
	// 	legalityclass: string
	// 	costsum: number
	// 	weightsum: number
	// 	uses: number
	// 	maxuses: number
	// 	parentuuid: string
	// 	uuid: string
	// 	itemid: string
	// 	gloablid: string
	// 	contains: any
	// 	img: string | null
	// }
	ads: { [key: string]: StaticAdvantage }
	skills: { [key: string]: StaticSkill }
	spells: { [key: string]: StaticSpell }
	eqtsummary: number
	melee: { [key: string]: StaticMelee }
	ranged: { [key: string]: StaticRanged }
	bonuses: string
	equipped: boolean
	carried: boolean
	globalid: string
	uuid: string
}
