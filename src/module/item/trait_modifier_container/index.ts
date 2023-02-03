import { ContainerGURPS } from "@item/container"
import { TraitModifierGURPS } from "@item/trait_modifier"
import { TraitModifierContainerData } from "./data"

class TraitModifierContainerGURPS extends ContainerGURPS {
	// Embedded Items
	get children(): Collection<TraitModifierGURPS | TraitModifierContainerGURPS> {
		return super.children as Collection<TraitModifierGURPS | TraitModifierContainerGURPS>
	}
}

interface TraitModifierContainerGURPS {
	readonly system: TraitModifierContainerData
}

export { TraitModifierContainerGURPS }
