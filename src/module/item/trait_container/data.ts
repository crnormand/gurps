import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data";
import { CRAdjustment } from "@module/data";

export type TraitContainerSource = BaseContainerSource<"trait_container", TraitContainerSystemData>;

// Export class TraitContainerData extends BaseContainerData<TraitContainerGURPS> {}

export interface TraitContainerData extends Omit<TraitContainerSource, "effects" | "items">, TraitContainerSystemData {
	readonly type: TraitContainerSource["type"];
	data: TraitContainerSystemData;
	readonly _source: TraitContainerSource;
}

export interface TraitContainerSystemData extends BaseContainerSystemData {
	// Modifiers: Array<any>;
	disabled: boolean;
	container_type: TraitContainerType;
	// Calc: {
	// 	points: number;
	// };
	cr: number;
	cr_adj: CRAdjustment;
}

export type TraitContainerType = "group" | "meta_trait" | "race" | "alternative_abilities";
