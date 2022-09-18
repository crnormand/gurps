import { BaseItemSourceGURPS, ItemSystemData } from "@item/base/data";
import { ItemType } from "@item/data";

export type BaseContainerSource<
	TItemType extends ItemType = ItemType,
	TSystemData extends BaseContainerSystemData = BaseContainerSystemData
> = BaseItemSourceGURPS<TItemType, TSystemData>;

// Export class BaseContainerData<
// 	TItem extends ContainerGURPS = ContainerGURPS,
// 	TSystemData extends BaseContainerSystemData = BaseContainerSystemData,
// 	//@ts-ignore
// > extends BaseItemDataGURPS<TItem> {}
// export interface BaseContainerData extends BaseItemDataGURPS, BaseContainerSystemData {}

export interface BaseContainerSystemData extends ItemSystemData {
	open?: boolean;
}
