import { ContainerGURPS } from "@item/container";
import { RitualMagicSpellGURPS } from "@item/ritual_magic_spell";
import { SpellGURPS } from "@item/spell";
import { SpellContainerData } from "./data";

export class SpellContainerGURPS extends ContainerGURPS {
	// Static override get schema(): typeof SpellContainerData {
	// 	return SpellContainerData;
	// }

	// Embedded Items
	get children(): Collection<SpellGURPS | RitualMagicSpellGURPS | SpellContainerGURPS> {
		return super.children as Collection<SpellGURPS | RitualMagicSpellGURPS | SpellContainerGURPS>;
	}
}

export interface SpellContainerGURPS {
	readonly system: SpellContainerData;
}
