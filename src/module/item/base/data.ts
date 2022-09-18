// Import { ItemType } from "@item/data";
import { ItemFlagsGURPS, ItemType } from "@item/data";
import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
// Import { BaseItemGURPS } from ".";

export interface BaseItemSourceGURPS<
	TItemType extends ItemType = ItemType,
	TSystemData extends ItemSystemData = ItemSystemData
> extends ItemDataSource {
	type: TItemType;
	system: TSystemData;
	flags: DeepPartial<ItemFlagsGURPS>;
}

// Export abstract class BaseItemDataGURPS<TItem extends BaseItemGURPS = BaseItemGURPS> extends foundry.data.ItemData {
// 	enabled?: boolean;
// }

// export interface BaseItemDataGURPS extends Omit<BaseItemSourceGURPS, "effects" g>, ItemSystemData {
// 	type: ItemType;
// 	// data: ItemSystemData;
// 	// flags: ItemFlagsGURPS;
// 	//this should not be here
// 	// modifiers: any;

// 	readonly _source: BaseItemSourceGURPS;
// }

export interface ItemSystemData {
	id: string;
	name: string;
	reference: string;
	notes: string;
	tags: Array<string>;
	type: ItemType;
}
