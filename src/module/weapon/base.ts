import { SkillDefault } from "@module/default";
import { MeleeWeapon, WeaponType } from ".";
import { EquipmentContainerGURPS, EquipmentGURPS, ItemGURPS, TraitGURPS } from "@item";
import { TooltipGURPS } from "@module/tooltip";
import { CharacterGURPS } from "@actor";
import { i18n, signed, stringCompare } from "@util";
import { Feature } from "@feature";
import { SkillBonus } from "@feature/skill_bonus";
import { gid } from "@module/data";
import { WeaponDamage } from "./damage";

export interface WeaponConstructionContext {
	ready?: boolean;
	recursive?: boolean;
}

class BaseWeapon {
	type: WeaponType = "melee_weapon";

	// Damage: WeaponDamage;
	strength = "";

	usage = "";

	usage_notes = "";

	defaults: SkillDefault[] = [];

	constructor(data: BaseWeapon | any, context: WeaponConstructionContext = {}) {
		// This.damage = new WeaponDamage({ parent: this });
		if (context?.ready) {
			Object.assign(this, data);
			// This.actor = this.parent.actor;
			this.defaults = this.defaults.map(e => {
				return new SkillDefault(e);
			});
			// This.damage = new WeaponDamage({ ...data.damage, ...{ parent: this } });
			this.damage = new WeaponDamage(data.damage);
			// Horrible hack to prevent max stack size error
			if (!context?.recursive)
				this.damage.parent = new BaseWeapon({ ...this }, { ...context, ...{ recursive: true } });
			// This.damage.parent = this;
		} else {
			mergeObject(context, { ready: true });
			const WeaponConstructor = (CONFIG as any).GURPS.Weapon.classes[data.type as WeaponType];
			return WeaponConstructor ? new WeaponConstructor(data, context) : new BaseWeapon(data, context);
		}
	}

	// Getters
	get name(): string {
		return this.parent.name ?? "";
	}

	get notes(): string {
		let buffer = "";
		if (this.parent) buffer += this.parent.notes;
		if (this.usage_notes.trim() !== "") {
			if (buffer.length !== 0) buffer += "\n";
			buffer += this.usage_notes;
		}
		return buffer;
	}

	get level(): number {
		return this.skillLevel();
	}

	skillLevel(tooltip?: TooltipGURPS): number {
		const actor = this.actor;
		if (!actor) return 0;
		let primaryTooltip = new TooltipGURPS();
		if (tooltip) primaryTooltip = tooltip;
		const adj =
			this.skillLevelBaseAdjustment(actor, primaryTooltip) + this.skillLevelPostAdjustment(actor, primaryTooltip);
		let best = -Infinity;
		for (const def of this.defaults) {
			let level = def.skillLevelFast(actor, false, null, true);
			if (level !== -Infinity) {
				level += adj;
				if (best < level) best = level;
			}
		}
		if (best === -Infinity) return 0;
		if (tooltip && primaryTooltip && primaryTooltip.length !== 0) {
			if (tooltip.length !== 0) tooltip.push("\n");
			tooltip.push(primaryTooltip);
		}
		if (best < 0) best = 0;
		return best;
	}

	skillLevelBaseAdjustment(actor: CharacterGURPS, tooltip: TooltipGURPS): number {
		let adj = 0;
		const minST = this.resolvedMinimumStrength - (actor.strengthOrZero + actor.striking_st_bonus);
		if (minST > 0) adj -= minST;
		const nameQualifier = this.parent.name;
		for (const bonus of actor.namedWeaponSkillBonusesFor(
			"weapon_named.*",
			nameQualifier ?? "",
			this.usage,
			this.parent.tags,
			tooltip
		)) {
			adj += bonus.adjustedAmount;
		}
		for (const bonus of actor.namedWeaponSkillBonusesFor(
			`weapon_named./${nameQualifier}`,
			nameQualifier ?? "",
			this.usage,
			this.parent.tags,
			tooltip
		)) {
			adj += bonus.adjustedAmount;
		}
		for (const f of this.parent.features) {
			adj += this.extractSkillBonusForThisWeapon(f, tooltip);
		}
		if (
			this.parent instanceof TraitGURPS ||
			this.parent instanceof EquipmentGURPS ||
			this.parent instanceof EquipmentContainerGURPS
		) {
			for (const mod of this.parent.modifiers) {
				for (const f of mod.features) {
					adj += this.extractSkillBonusForThisWeapon(f, tooltip);
				}
			}
		}
		return adj;
	}

	skillLevelPostAdjustment(actor: CharacterGURPS, tooltip: TooltipGURPS): number {
		if (this instanceof MeleeWeapon)
			if (this.parry?.toLowerCase().includes("f")) return this.encumbrancePenalty(actor, tooltip);
		return 0;
	}

	encumbrancePenalty(actor: CharacterGURPS, tooltip: TooltipGURPS): number {
		if (!actor) return 0;
		const penalty = actor.encumbranceLevel(true).penalty;
		if (penalty !== 0 && tooltip) {
			tooltip.push("\n");
			tooltip.push(i18n("gurps.tooltip.encumbrance"));
			tooltip.push(` [${signed(penalty)}]`);
		}
		return penalty;
	}

	extractSkillBonusForThisWeapon(f: Feature, tooltip: TooltipGURPS): number {
		if (f instanceof SkillBonus) {
			if (f.selection_type === "this_weapon") {
				if (stringCompare(this.usage, f.specialization)) {
					f.addToTooltip(tooltip);
					return f.adjustedAmount;
				}
			}
		}
		return 0;
	}

	get resolvedMinimumStrength(): number {
		let started = false;
		let value = 0;
		for (const ch of this.strength) {
			if (ch.match("d")) {
				value *= 10;
				value += parseInt(ch);
				started = true;
			} else if (started) break;
		}
		return value;
	}

	get fastResolvedDamage(): string {
		return this.damage.resolvedDamage();
	}

	resolvedValue(input: string, baseDefaultType: string, tooltip?: TooltipGURPS): string {
		const actor = this.actor;
		input = input ?? "";
		if (!actor) return input;
		let buffer = "";
		let skillLevel = -Infinity;
		let line = input;
		let max = line.length;
		if (input !== "")
			for (let i = 0; i < max; i++) {
				max = line.length;
				while (i < max && input[i] === " ") i++;
				let ch = line[i];
				let neg = false;
				let modifier = 0;
				let found = false;
				if (ch === "+" || ch === "-") {
					neg = ch === "-";
					i++;
					if (i < max) ch = line[i];
				}
				while (i < max && ch.match("[0-9]")) {
					found = true;
					modifier *= 10;
					modifier += parseInt(ch);
					i++;
					if (i < max) ch = line[i];
				}
				if (found) {
					if (skillLevel === -Infinity) {
						let primaryTooltip = new TooltipGURPS();
						let secondaryTooltip = new TooltipGURPS();
						if (tooltip) primaryTooltip = tooltip;
						let preAdj = this.skillLevelBaseAdjustment(actor, primaryTooltip);
						let postAdj = this.skillLevelPostAdjustment(actor, primaryTooltip);
						let adj = 3;
						if (baseDefaultType === gid.Parry) adj += actor.parryBonus;
						else adj += actor.blockBonus;
						let best = -Infinity;
						for (const def of this.defaults) {
							let level = def.skillLevelFast(actor, false, null, true);
							if (level === -Infinity) continue;
							level += preAdj;
							if (baseDefaultType !== def.type) Math.trunc((level = level / 2 + adj));
							level === postAdj;
							let possibleTooltip = new TooltipGURPS();
							if (def.type === gid.Skill && def.name === "Karate") {
								if (tooltip) possibleTooltip = tooltip;
								level += this.encumbrancePenalty(actor, possibleTooltip);
							}
							if (best < level) {
								best = level;
								secondaryTooltip = possibleTooltip;
							}
						}
						if (best !== -Infinity && tooltip) {
							if (primaryTooltip && primaryTooltip.length !== 0) {
								if (tooltip.length !== 0) tooltip.push("\n");
								tooltip.push(primaryTooltip);
							}
							if (secondaryTooltip && primaryTooltip.length !== 0) {
								if (tooltip.length !== 0) tooltip.push("\n");
								tooltip.push(secondaryTooltip);
							}
						}
						skillLevel = Math.max(best, 0);
					}
					if (neg) modifier = -modifier;
					const num = Math.trunc(skillLevel + modifier).toString();
					if (i < max) {
						buffer += num;
						line = line.substring(i);
					} else line = num;
				}
			}
		buffer += line;
		return buffer;
	}
}

interface BaseWeapon {
	actor: CharacterGURPS | null;
	parent: ItemGURPS;
	id: string;
	type: WeaponType;
	damage: WeaponDamage;
	strength: string;
	usage: string;
	usage_notes: string;
	reach: string;
	parry: string;
	block: string;
	accuracy: string;
	range: string;
	rate_of_fire: string;
	shots: string;
	bulk: string;
	recoil: string;
	defaults: SkillDefault[];
}

export { BaseWeapon };
