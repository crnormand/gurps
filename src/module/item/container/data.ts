import { ItemGCSSource, ItemGCSSystemData } from "@item/gcs"
import { ItemType } from "@module/data"

export type BaseContainerSource<
	TItemType extends ItemType = ItemType,
	TSystemData extends BaseContainerSystemData = BaseContainerSystemData
> = ItemGCSSource<TItemType, TSystemData>

export interface BaseContainerSystemData extends ItemGCSSystemData {
	open?: boolean
}
