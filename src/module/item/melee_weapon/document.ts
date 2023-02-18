import { BaseWeaponGURPS } from "@item/weapon"
import { gid } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { MeleeWeaponSystemData } from "./data"

class MeleeWeaponGURPS extends BaseWeaponGURPS {
	get fastResolvedParry(): string {
		return this.resolvedParry()
	}

	resolvedParry(tooltip?: TooltipGURPS): string {
		return this.resolvedValue(this.parry, gid.Parry, tooltip)
	}

	get fastResolvedBlock(): string {
		return this.resolvedBlock()
	}

	resolvedBlock(tooltip?: TooltipGURPS): string {
		return this.resolvedValue(this.block, gid.Block, tooltip)
	}

	get parry(): string {
		return this.system.parry
	}

	get block(): string {
		return this.system.block
	}

	get reach(): string {
		return this.system.reach
	}
}

interface MeleeWeaponGURPS extends BaseWeaponGURPS {
	readonly system: MeleeWeaponSystemData
}

export { MeleeWeaponGURPS }
