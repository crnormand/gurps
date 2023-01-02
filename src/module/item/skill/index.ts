import { ContainerGURPS } from "@item/container"
import { Difficulty, gid } from "@module/data"
import { SkillDefault } from "@module/default"
import { TooltipGURPS } from "@module/tooltip"
import { baseRelativeLevel, SkillData, SkillLevel } from "./data"

export class SkillGURPS extends ContainerGURPS {
	level: SkillLevel = { level: 0, relative_level: 0, tooltip: "" }

	unsatisfied_reason = ""

	// Static get schema(): typeof SkillData {
	// 	return SkillData;
	// }

	// Getters
	get formattedName(): string {
		const name: string = this.name ?? ""
		const specialization = this.specialization
		const TL = this.techLevel
		return `${name}${TL ? `/TL${TL}` : ""}${specialization ? ` (${specialization})` : ""}`
	}

	get points(): number {
		return this.system.points
	}

	get techLevel(): string {
		return this.system.tech_level
	}

	get attribute(): string {
		return this.system.difficulty?.split("/")[0] ?? gid.Dexterity
	}

	get difficulty(): string {
		return this.system.difficulty?.split("/")[1] ?? Difficulty.Average
	}

	get specialization(): string {
		return this.system.specialization
	}

	get defaultedFrom(): SkillDefault | undefined {
		return this.system.defaulted_from
	}

	set defaultedFrom(v: SkillDefault | undefined) {
		this.system.defaulted_from = v
	}

	get defaults(): SkillDefault[] {
		if (this.system.hasOwnProperty("defaults")) {
			const defaults: SkillDefault[] = []
			const list = (this.system as any).defaults
			for (const f of list ?? []) {
				defaults.push(new SkillDefault(f))
			}
			return defaults
		}
		return []
	}

	get encumbrancePenaltyMultiplier(): number {
		return this.system.encumbrance_penalty_multiplier
	}

	// Point & Level Manipulation
	get calculateLevel(): SkillLevel {
		if (!this.actor) return { level: -Infinity, relative_level: 0, tooltip: "" }
		const tooltip = new TooltipGURPS()
		let points = this.adjustedPoints(tooltip)
		const def = this.defaultedFrom
		if (!points) points = this.points ?? 0
		let relative_level = baseRelativeLevel(this.difficulty)
		let level = this.actor.resolveAttributeCurrent(this.attribute)
		if (level !== -Infinity) {
			if (this.difficulty === Difficulty.Wildcard) {
				points /= 3
			} else if (def && def.points > 0) {
				points += def.points
			}
			points = Math.floor(points)
			if (points === 1) {
				// Relative_level is preset to this point value
			} else if (points > 1 && points < 4) {
				relative_level += 1
			} else if (points >= 4) {
				relative_level += 1 + Math.floor(points / 4)
			} else if (this.difficulty !== "w" && def && def.points < 0) {
				relative_level = def.adjustedLevel - level
			} else {
				level = -Infinity
				relative_level = 0
			}
		}
		if (level !== -Infinity) {
			level += relative_level
			if (this.difficulty !== "w" && def && level < def.adjustedLevel) {
				level = def.adjustedLevel
			}
			let bonus = this.actor.skillBonusFor(this.name!, this.specialization, this.tags, tooltip)
			level += bonus
			relative_level += bonus
			bonus = this.actor.encumbranceLevel(true).penalty * this.encumbrancePenaltyMultiplier
			level += bonus
			relative_level += bonus
			if (bonus !== 0) {
				tooltip.push("TO DO")
			}
		}
		return {
			level: level,
			relative_level: relative_level,
			tooltip: tooltip.toString(),
		}
	}

	adjustedPoints(tooltip?: TooltipGURPS): number {
		let points = this.points
		if (this.actor) {
			points += this.actor.skillPointBonusFor(this.name!, this.specialization, this.tags, tooltip)
			// Points += this.actor.bonusFor(`skills.points/${this.name}`, tooltip)
			points = Math.max(points, 0)
		}
		return points
	}

	get skillLevel(): string {
		if (this.calculateLevel.level === -Infinity) return "-"
		return this.calculateLevel.level.toString()
	}

	get relativeLevel(): string {
		if (this.calculateLevel.level === -Infinity) return "-"
		return (
			(this.actor?.attributes?.get(this.attribute)?.attribute_def.name ?? "") +
			this.calculateLevel.relative_level.signedString()
		)
	}

	updateLevel(): boolean {
		const saved = this.level
		this.defaultedFrom = this.bestDefaultWithPoints()
		this.level = this.calculateLevel
		if (this.defaultedFrom) {
			const def = this.defaultedFrom
			const previous = this.level
			this.defaultedFrom = undefined
			this.level = this.calculateLevel
			if (this.level.level < previous.level) {
				this.defaultedFrom = def
				this.level = previous
			}
		}
		return saved.level !== this.level.level
	}

	bestDefaultWithPoints(excluded?: SkillDefault): SkillDefault | undefined {
		if (!this.actor) return
		const best = this.bestDefault()
		if (best) {
			const baseline = this.actor.resolveAttributeCurrent(this.attribute) + baseRelativeLevel(this.difficulty)
			const level = best.level
			best.adjusted_level = level
			if (level === baseline) best.points = 1
			else if (level === baseline + 1) best.points = 2
			else if (level > baseline + 1) best.points = 4 * (level - (baseline + 1))
			else best.points = -Math.max(level, 0)
		}
		return best
	}

	bestDefault(excluded?: SkillDefault): SkillDefault | undefined {
		if (!this.actor || !this.defaults) return
		const excludes = new Map()
		excludes.set(this.name!, true)
		let bestDef = new SkillDefault()
		let best = -Infinity
		for (const def of this.resolveToSpecificDefaults()) {
			if (def.equivalent(excluded) || this.inDefaultChain(def, new Map())) continue
			let level = this.calcSkillDefaultLevel(def, excludes)
			if (best < level) {
				best = level
				bestDef = def.noLevelOrPoints
				bestDef.level = level
			}
		}
		return bestDef
	}

	calcSkillDefaultLevel(def: SkillDefault, excludes: Map<string, boolean>): number {
		let level = def.skillLevel(this.actor!, true, excludes, this.type.startsWith("skill"))
		if (def.skillBased) {
			const other = this.actor?.bestSkillNamed(def.name!, def.specialization!, true, excludes)
			if (other) {
				level -= this.actor!.skillBonusFor(def.name!, def.specialization!, this.tags, undefined)
			}
		}
		return level
	}

	resolveToSpecificDefaults(): SkillDefault[] {
		const result: SkillDefault[] = []
		for (const def of this.defaults) {
			if (!this.actor || !def || !def.skillBased) {
				result.push(def)
			} else {
				const m: Map<string, boolean> = new Map()
				m.set(this.formattedName, true)
				for (const s of this.actor.skillNamed(def.name!, def.specialization!, true, m)) {
					const local = new SkillDefault(duplicate(def))
					local.specialization = s.specialization
					result.push(local)
				}
			}
		}
		return result
	}

	equivalent(def: SkillDefault, other: SkillDefault | null): boolean {
		return (
			other !== null &&
			def.type === other.type &&
			def.modifier === other.modifier &&
			def.name === other.name &&
			def.specialization === other.specialization
		)
	}

	inDefaultChain(def: SkillDefault | undefined, lookedAt: Map<string, boolean>): boolean {
		if (!this.actor || !def || !def.name) return false
		let hadOne = false
		for (const one of (this.actor.skills as Collection<SkillGURPS>).filter(
			s => s.name === def.name && s.specialization === def.specialization
		)) {
			if (one === this) return true
			if (typeof one.id === "string" && lookedAt.get(one.id)) {
				lookedAt.set(one.id, true)
				if (this.inDefaultChain(one.defaultedFrom, lookedAt)) return true
			}
			hadOne = true
		}
		return !hadOne
	}
}

export interface SkillGURPS {
	readonly system: SkillData
}
