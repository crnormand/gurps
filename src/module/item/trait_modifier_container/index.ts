import { ContainerGURPS } from "@item/container";
import { TraitModifierGURPS } from "@item/trait_modifier";
import { TraitModifierContainerData } from "./data";

export class TraitModifierContainerGURPS extends ContainerGURPS {
	// Embedded Items
	get children(): Collection<TraitModifierGURPS | TraitModifierContainerGURPS> {
		return super.children as Collection<TraitModifierGURPS | TraitModifierContainerGURPS>;
	}
}

export interface TraitModifierContainerGURPS {
	readonly system: TraitModifierContainerData;
}
