import { gid } from "@module/data";
import { TooltipGURPS } from "@module/tooltip";
import { BaseWeapon } from "./base";

class MeleeWeapon extends BaseWeapon {
	// Reach = "";
	// parry = "";
	// block = "";

	get fastResolvedParry(): string {
		return this.resolvedParry();
	}

	resolvedParry(tooltip?: TooltipGURPS): string {
		return this.resolvedValue(this.parry, gid.Parry, tooltip);
	}

	get fastResolvedBlock(): string {
		return this.resolvedBlock();
	}

	resolvedBlock(tooltip?: TooltipGURPS): string {
		return this.resolvedValue(this.block, gid.Block, tooltip);
	}
}

interface MeleeWeapon extends BaseWeapon {
	reach: string;
	parry: string;
	block: string;
}

export { MeleeWeapon };
