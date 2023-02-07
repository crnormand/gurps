import { ItemType } from "@item/data"
import { ItemGCSSource, ItemGCSSystemData } from "@item/gcs"

export type BaseContainerSource<
	TItemType extends ItemType = ItemType,
	TSystemData extends BaseContainerSystemData = BaseContainerSystemData
> = ItemGCSSource<TItemType, TSystemData>

export interface BaseContainerSystemData extends ItemGCSSystemData {
	open?: boolean
}
