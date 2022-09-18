import { Feature } from "@feature";
import { BaseItemSourceGURPS, ItemSystemData } from "@item/base/data";

export type TraitModifierSource = BaseItemSourceGURPS<"modifier", TraitModifierSystemData>;

// Export class TraitModifierData extends BaseItemDataGURPS<TraitModifierGURPS> {}

export interface TraitModifierData extends Omit<TraitModifierSource, "effects">, TraitModifierSystemData {
	readonly type: TraitModifierSource["type"];
	data: TraitModifierSystemData;

	readonly _source: TraitModifierSource;
}

export interface TraitModifierSystemData extends ItemSystemData {
	disabled: boolean;
	cost_type: TraitModifierCostType;
	cost: number;
	levels: number;
	affects: TraitModifierAffects;
	features: Feature[];
}

export type TraitModifierCostType = "percentage" | "points" | "multiplier";
export type TraitModifierAffects = "total" | "base_only" | "levels_only";
