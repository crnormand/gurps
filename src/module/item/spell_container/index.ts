import { ContainerGURPS } from "@item/container"
import { RitualMagicSpellGURPS } from "@item/ritual_magic_spell"
import { SpellGURPS } from "@item/spell"
import { SpellContainerData } from "./data"

export class SpellContainerGURPS extends ContainerGURPS {
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

export interface SpellContainerGURPS {
	readonly system: SpellContainerData
}
