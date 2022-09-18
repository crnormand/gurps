import { CharacterGURPS } from "@actor";
import { SkillGURPS, TechniqueGURPS } from "@item";
import { gid } from "@module/data";

const skill_based_default_types: Map<string, boolean> = new Map();
skill_based_default_types.set(gid.Skill, true);
skill_based_default_types.set(gid.Parry, true);
skill_based_default_types.set(gid.Block, true);

export type SkillDefaultType = "block" | "parry" | "skill" | "10" | string;

export class SkillDefault {
	type = "skill";

	name?: string;

	specialization?: string;

	modifier = 0;

	level = 0;

	adjusted_level = 0;

	points = 0;

	constructor(data?: SkillDefaultDef) {
		if (data) Object.assign(this, data);
	}

	// For the sake of naming consistency
	get adjustedLevel(): number {
		return this.adjusted_level;
	}

	get skillBased(): boolean {
		return skill_based_default_types.get(this.type) ?? false;
	}

	equivalent(other: SkillDefault): boolean {
		return (
			other &&
			this.type === other.type &&
			this.modifier === other.modifier &&
			this.name === other.name &&
			this.specialization === other.specialization
		);
	}

	fullName(actor: CharacterGURPS): string {
		if (this.skillBased) {
			let buffer = "";
			buffer += this.name;
			if (this.specialization) buffer += ` (${this.specialization})`;
			if (this.type === gid.Dodge) buffer += " Dodge";
			else if (this.type === gid.Parry) buffer += " Parry";
			else if (this.type === gid.Block) buffer += " Block";
			return buffer;
		}
		return actor.resolveAttributeName(this.type);
	}

	skillLevel(
		actor: CharacterGURPS,
		require_points: boolean,
		excludes: Map<string, boolean>,
		rule_of_20: boolean
	): number {
		let best = Math.max();
		switch (this.type) {
			case "parry":
				best = this.best(actor, require_points, excludes);
				if (best !== Math.max()) best = best / 2 + 3 + actor.calc.parry_bonus;
				return this.finalLevel(best);
			case "block":
				best = this.best(actor, require_points, excludes);
				if (best !== Math.max()) best = best / 2 + 3 + actor.calc.block_bonus;
				return this.finalLevel(best);
			case "skill":
				return this.finalLevel(this.best(actor, require_points, excludes));
			default:
				return this.skillLevelFast(actor, require_points, excludes, rule_of_20);
		}
	}

	best(actor: CharacterGURPS, require_points: boolean, excludes: Map<string, boolean>): number {
		let best = Math.max();
		for (const s of actor.skillNamed(this.name!, this.specialization || "", require_points, excludes)) {
			const level = s.calculateLevel.level;
			if (best < level) best = level;
		}
		return best;
	}

	skillLevelFast(
		actor: CharacterGURPS,
		require_points: boolean,
		excludes: Map<string, boolean> | null = new Map(),
		rule_of_20: boolean
	): number {
		let level = 0;
		let best = 0;
		switch (this.type) {
			case gid.Dodge:
				level = actor.dodge(actor.encumbranceLevel(true));
				if (rule_of_20 && level > 20) level = 20;
				return this.finalLevel(level);
			case gid.Parry:
				best = this.bestFast(actor, require_points, excludes);
				if (best !== Math.max()) best = Math.floor(best / 2) + 3 + actor.calc.parry_bonus;
				return this.finalLevel(best);
			case gid.Block:
				best = this.bestFast(actor, require_points, excludes);
				if (best !== Math.max()) best = Math.floor(best / 2) + 3 + actor.calc.block_bonus;
				return this.finalLevel(best);
			case gid.Skill:
				return this.finalLevel(this.bestFast(actor, require_points, excludes));
			default:
				level = actor.resolveAttributeCurrent(this.type);
				if (rule_of_20) level = Math.min(level, 20);
				return this.finalLevel(level);
		}
	}

	bestFast(actor: CharacterGURPS, require_points: boolean, excludes: Map<string, boolean> | null): number {
		let best = Math.max();
		for (let sk of actor.skillNamed(this.name!, this.specialization || "", require_points, excludes)) {
			sk = sk as SkillGURPS | TechniqueGURPS;
			if (best < sk.level.level) best = sk.level.level;
		}
		return best;
	}

	finalLevel(level: number): number {
		if (level !== Math.max()) level += this.modifier;
		return level;
	}

	get noLevelOrPoints(): SkillDefault {
		return new SkillDefault({
			type: this.type,
			name: this.name,
			modifier: this.modifier,
			level: 0,
			adjusted_level: 0,
			points: 0,
		});
	}
}

export interface SkillDefaultDef {
	type: SkillDefaultType;
	name?: string;
	specialization?: string;
	modifier: number;
	level?: number;
	adjusted_level?: number;
	points?: number;
}
