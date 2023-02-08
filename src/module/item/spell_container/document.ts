import { ItemGCS } from "@item/gcs"
import { RitualMagicSpellGURPS } from "@item/ritual_magic_spell"
import { SpellGURPS } from "@item/spell"
import { SpellContainerData } from "./data"

class SpellContainerGURPS extends ItemGCS {
	// Static override get schema(): typeof SpellContainerData {
	// 	return SpellContainerData;
	// }

	// Embedded Items
	get children(): Collection<SpellGURPS | RitualMagicSpellGURPS | SpellContainerGURPS> {
		return super.children as Collection<SpellGURPS | RitualMagicSpellGURPS | SpellContainerGURPS>
	}

	adjustedPoints(): number {
		return this.points
	}

	get points(): number {
		let points = 0
		for (const child of this.children) points += child.adjustedPoints()
		return points
	}
}

interface SpellContainerGURPS {
	readonly system: SpellContainerData
}

export { SpellContainerGURPS }
