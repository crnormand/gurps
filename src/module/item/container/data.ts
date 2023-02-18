import { BaseItemSourceGURPS } from "@item/base"
import { ItemType } from "@module/data"

export type BaseContainerSource<
	TItemType extends ItemType = ItemType,
	TSystemData extends object = BaseContainerSystemData
> = BaseItemSourceGURPS<TItemType, TSystemData>

export interface BaseContainerSystemData {
	open?: boolean
}
