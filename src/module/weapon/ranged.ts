import { BaseWeapon } from "./base";

class RangedWeapon extends BaseWeapon {
	// Accuracy = "";
	// range = "";
	// rate_of_fire = "";
	// shots = "";
	// bulk = "";
	// recoil = "";

	get resolvedRange(): string {
		const actor = this.actor;
		if (!actor) return this.range;
		const st = Math.trunc(actor.strengthOrZero + actor.throwing_st_bonus);
		let savedRange = "";
		let calcRange = this.range;
		while (calcRange !== savedRange) {
			savedRange = calcRange;
			calcRange = this.resolveRange(calcRange, st);
		}
		return calcRange;
	}

	resolveRange(inRange: string, st: number): string {
		const where = inRange.indexOf("x");
		if (where === -1) return inRange;
		let last = where + 1;
		let max = inRange.length;
		if (last < max && inRange[last] === " ") last++;
		if (last >= max) return inRange;
		let ch = inRange[last];
		let found = false;
		let decimal = false;
		let started = last;
		while ((!decimal && ch === ".") || ch.match("[0-9]")) {
			found = true;
			if (ch === ".") decimal = true;
			last++;
			if (last >= max) break;
			ch = inRange[last];
		}
		if (!found) return inRange;
		let value = parseFloat(inRange.substring(started, last));
		let buffer = "";
		if (where > 0) buffer += inRange.substring(0, where);
		buffer += Math.trunc(value * st).toString();
		if (last < max) buffer += inRange.substring(last);
		return buffer;
	}
}

interface RangedWeapon extends BaseWeapon {
	accuracy: string;
	range: string;
	rate_of_fire: string;
	shots: string;
	bulk: string;
	recoil: string;
}

export { RangedWeapon };
