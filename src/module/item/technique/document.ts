import { ItemGCS } from "@item/gcs"
import { SkillLevel } from "@item/skill/data"
import { ActorType, Difficulty, gid } from "@module/data"
import { SkillDefault } from "@module/default"
import { TooltipGURPS } from "@module/tooltip"
import { TechniqueData } from "./data"

class TechniqueGURPS extends ItemGCS {
	level: SkillLevel = { level: 0, relative_level: 0, tooltip: "" }

	unsatisfied_reason = ""

	private _dummyActor: (typeof CONFIG.GURPS.Actor.documentClasses)[ActorType.Character] | null = null

	// Static get schema(): typeof TechniqueData {
	// 	return TechniqueData;
	// }

	// Getters
	get points(): number {
		return this.system.points
	}

	set points(n: number) {
		this.system.points = n
	}

	get techLevel(): string {
		return this.system.tech_level
	}

	get specialization(): string {
		return ""
	}

	get limit(): number {
		return this.system.limit
	}

	get difficulty(): string {
		return this.system.difficulty
	}

	get defaultedFrom(): SkillDefault | undefined {
		return this.system.defaulted_from
	}

	set defaultedFrom(v: SkillDefault | undefined) {
		this.system.defaulted_from = v
	}

	get default(): SkillDefault {
		return new SkillDefault(this.system.default)
	}

	adjustedPoints(tooltip?: TooltipGURPS): number {
		let points = this.points
		if (this.actor) {
			points += this.actor.skillPointBonusFor(this.name!, "", this.tags, tooltip)
			// Points += this.actor.bonusFor(`skills.points/${this.name}`, tooltip)
			points = Math.max(points, 0)
		}
		return points
	}

	satisfied(tooltip: TooltipGURPS): boolean {
		if (this.default.type !== "skill") return true
		const sk = this.actor?.bestSkillNamed(this.default.name ?? "", this.default.specialization ?? "", false, null)
		const satisfied = (sk && (sk instanceof TechniqueGURPS || sk.points > 0)) || false
		if (!satisfied) {
			// Tooltip.push(prefix)
			if (!sk) tooltip.push("gurps.prereqs.technique.skill")
			else tooltip.push("gurps.prereqs.technique.point")
			tooltip.push(this.default.fullName(this.actor!))
		}
		return satisfied
	}

	get skillLevel(): string {
		if (this.calculateLevel.level === -Infinity) return "-"
		return this.calculateLevel.level.toString()
	}

	get relativeLevel(): string {
		if (this.calculateLevel.level === -Infinity) return "-"
		return this.calculateLevel.relative_level.signedString()
	}

	// Point & Level Manipulation
	updateLevel(): boolean {
		const saved = this.level
		this.defaultedFrom = undefined
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
		return saved !== this.level
	}

	get effectiveLevel(): number {
		return this.calculateLevel.level
	}

	// Used for defaults
	get dummyActor(): (typeof CONFIG.GURPS.Actor.documentClasses)[ActorType.Character] | null {
		return this._dummyActor
	}

	set dummyActor(actor: (typeof CONFIG.GURPS.Actor.documentClasses)[ActorType.Character] | null) {
		this._dummyActor = actor
	}

	get calculateLevel(): SkillLevel {
		const actor = this.actor || this.dummyActor
		const tooltip = new TooltipGURPS()
		let relative_level = 0
		let points = this.adjustedPoints()
		let level = -Infinity
		if (actor) {
			if (this.default?.type === gid.Skill) {
				const sk = actor.baseSkill(this.default!, true)
				if (sk) level = sk.calculateLevel.level
			} else if (this.default) {
				level = (this.default?.skillLevelFast(actor, true, false, null) ?? 0) - (this.default?.modifier ?? 0)
			}
			if (level !== -Infinity) {
				const base_level = level
				level += this.default.modifier
				if (this.difficulty === Difficulty.Hard) points -= 1
				if (points > 0) relative_level = points
				if (level !== -Infinity) {
					// Relative_level += actor.bonusFor(`skill.name/${this.name}`, tooltip)
					relative_level += actor.skillBonusFor(this.name!, this.specialization, this.tags, tooltip)
					level += relative_level
				}
				if (this.limit) {
					const max = base_level + this.limit
					if (level > max) {
						relative_level -= level - max
						level = max
					}
				}
			}
		}
		return {
			level: level,
			relative_level: relative_level,
			tooltip: tooltip.toString(),
		}
	}

	incrementSkillLevel() {
		const basePoints = this.points + 1
		let maxPoints = basePoints
		if (this.difficulty === Difficulty.Wildcard) maxPoints += 12
		else maxPoints += 4

		const oldLevel = this.calculateLevel.level
		for (let points = basePoints; points < maxPoints; points++) {
			this.system.points = points
			if (this.calculateLevel.level > oldLevel) {
				return this.update({ "system.points": points })
			}
		}
	}

	decrementSkillLevel() {
		if (this.points <= 0) return
		const basePoints = this.points
		let minPoints = basePoints
		if (this.difficulty === Difficulty.Wildcard) minPoints -= 12
		else minPoints -= 4
		minPoints = Math.max(minPoints, 0)

		let oldLevel = this.calculateLevel.level
		for (let points = basePoints; points >= minPoints; points--) {
			this.system.points = points
			if (this.calculateLevel.level < oldLevel) {
				break
			}
		}

		if (this.points > 0) {
			let oldLevel = this.calculateLevel.level
			while (this.points > 0) {
				this.system.points = Math.max(this.points - 1, 0)
				if (this.calculateLevel.level !== oldLevel) {
					this.system.points++
					return this.update({ "system.points": this.points })
				}
			}
		}
	}
}

interface TechniqueGURPS {
	readonly system: TechniqueData
}

export { TechniqueGURPS }
