import { BaseItemSourceGURPS } from "@item/base"
import { ItemType } from "@module/data"

export type ItemGCSSource<
	TItemType extends ItemType = ItemType,
	TSystemData extends ItemGCSSystemData = ItemGCSSystemData
> = BaseItemSourceGURPS<TItemType, TSystemData>

export interface ItemGCSSystemData {
	id: string
	name: string
	reference: string
	notes: string
	vtt_notes: string
	tags: Array<string>
	type: ItemType
}
