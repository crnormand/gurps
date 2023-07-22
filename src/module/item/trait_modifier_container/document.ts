import { ItemGCS } from "@item/gcs"
import { TraitModifierGURPS } from "@item/trait_modifier"
import { TraitModifierContainerData } from "./data"

class TraitModifierContainerGURPS extends ItemGCS {
	// Embedded Items
	get children(): Collection<TraitModifierGURPS | TraitModifierContainerGURPS> {
		return super.children as Collection<TraitModifierGURPS | TraitModifierContainerGURPS>
	}

	get enabled(): boolean {
		return true
	}
}

interface TraitModifierContainerGURPS {
	readonly system: TraitModifierContainerData
}

export { TraitModifierContainerGURPS }
