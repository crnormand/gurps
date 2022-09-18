import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data";

export type SpellContainerSource = BaseContainerSource<"spell_container", SpellContainerSystemData>;

// Export class SpellContainerData extends BaseContainerData<SpellContainerGURPS> {}

export interface SpellContainerData extends Omit<SpellContainerSource, "effects" | "items">, SpellContainerSystemData {
	readonly type: SpellContainerSource["type"];
	data: SpellContainerSystemData;

	readonly _source: SpellContainerSource;
}

export type SpellContainerSystemData = BaseContainerSystemData;
