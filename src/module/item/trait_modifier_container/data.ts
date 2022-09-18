import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data";

export type TraitModifierContainerSource = BaseContainerSource<"modifier_container", TraitModifierContainerSystemData>;

// Export class TraitModifierContainerData extends BaseContainerData<TraitModifierContainerGURPS> {}

export interface TraitModifierContainerData
	extends Omit<TraitModifierContainerSource, "effects" | "items">,
		TraitModifierContainerSystemData {
	readonly type: TraitModifierContainerSource["type"];
	data: TraitModifierContainerSystemData;
	readonly _source: TraitModifierContainerSource;
}

export type TraitModifierContainerSystemData = BaseContainerSystemData;
