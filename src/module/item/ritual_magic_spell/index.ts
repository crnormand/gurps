import { BaseItemGURPS } from "@item/base"
import { SkillLevel } from "@item/skill/data"
import { Difficulty, gid } from "@module/data"
import { SkillDefault } from "@module/default"
import { TooltipGURPS } from "@module/tooltip"
import { RitualMagicSpellData } from "./data"

export class RitualMagicSpellGURPS extends BaseItemGURPS {
	level: SkillLevel = { level: 0, relative_level: 0, tooltip: "" }

	unsatisfied_reason = ""

	// Static get schema(): typeof RitualMagicSpellData {
	// 	return RitualMagicSpellData;
	// }

	// Getters
	get points(): number {
		return this.system.points
	}

	get techLevel(): string {
		return this.system.tech_level
	}

	get attribute(): string {
		return this.system.difficulty?.split("/")[0] ?? gid.Intelligence
	}

	get difficulty(): string {
		return this.system.difficulty?.split("/")[1] ?? Difficulty.Hard
	}

	get powerSource(): string {
		return this.system.power_source
	}

	get college(): string[] {
		return this.system.college
	}

	get baseSkill(): string {
		return this.system.base_skill
	}

	get prereqCount(): number {
		return this.system.prereq_count
	}

	adjustedPoints(tooltip?: TooltipGURPS): number {
		let points = this.points
		if (this.actor) {
			points += this.actor.spellPointBonusesFor(this.name!, this.powerSource, this.college, this.tags, tooltip)
			// Points += this.actor.bestCollegeSpellPointBonus(this.college, this.tags, tooltip)
			// points += this.actor.spellPointBonusesFor("spell.power_source.points", this.powerSource, this.tags, tooltip)
			// points += this.actor.spellPointBonusesFor("spell.points", this.name ?? "", this.tags, tooltip)
			points = Math.max(points, 0)
		}
		return points
	}

	satisfied(tooltip: TooltipGURPS, prefix: string): boolean {
		if (this.college.length === 0) {
			tooltip.push(prefix)
			tooltip.push("gurps.ritual_magic_spell.must_assign_college")
			return false
		}
		for (const c of this.college) {
			if (this.actor?.bestSkillNamed(this.baseSkill, c, false, null)) return true
		}
		if (this.actor?.bestSkillNamed(this.baseSkill, "", false, null)) return true
		tooltip.push(prefix)
		tooltip.push("gurps.prereqs.ritual_magic.skill.name")
		tooltip.push(this.baseSkill)
		tooltip.push(` (${this.college[0]})`)
		const colleges = this.college
		colleges.shift()
		for (const c of colleges) {
			tooltip.push("gurps.prereqs.ritual_magic.skill.or")
			tooltip.push(this.baseSkill)
			tooltip.push(`(${c})`)
		}
		return false
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

	// Point & Level Manipulation
	updateLevel(): boolean {
		const saved = this.level
		this.level = this.calculateLevel
		return saved !== this.level
	}

	get calculateLevel(): SkillLevel {
		// Const tooltip = new TooltipGURPS()
		// let relativeLevel = difficultyRelativeLevel(this.system.difficulty)
		// let level = -Infinity
		// if (this.actor) {
		// 	let points = Math.trunc(this.points)
		// 	level = this.actor.resolveAttributeCurrent(this.attribute)
		// 	if (this.system.difficulty === Difficulty.Wildcard) points = Math.trunc(points / 3)
		// 	if (points < 1) {
		// 		level = -Infinity
		// 		relativeLevel = 0
		// 	} else if (points === 0) {
		// 		// do nothing
		// 	} else if (points < 4) {
		// 		relativeLevel += 1
		// 	} else {
		// 		relativeLevel += 1 + Math.trunc(points/4)
		// 	}
		// 	if (level !== -Infinity) {
		// 		relativeLevel += this.actor.spellBonusFor(this.name!, this.powerSource, this.college, this.tags, tooltip)
		// 		relativeLevel = Math.trunc(relativeLevel)
		// 		level += relativeLevel
		// 	}
		// }
		// return  {
		// 	level: level,
		// 	relative_level: relativeLevel,
		// 	tooltip: tooltip.toString()
		// }
		let skillLevel: SkillLevel = {
			level: -Infinity,
			relative_level: 0,
			tooltip: new TooltipGURPS(),
		}
		if (this.college.length === 0) skillLevel = this.determineLevelForCollege("")
		else {
			for (const c of this.college) {
				const possible = this.determineLevelForCollege(c)
				if (skillLevel.level < possible.level) skillLevel = possible
			}
		}
		if (this.actor) {
			const tooltip = new TooltipGURPS()
			tooltip.push(skillLevel.tooltip)
			let levels = Math.trunc(
				this.actor.spellBonusFor(this.name!, this.powerSource, this.college, this.tags, tooltip)
			)
			// Let levels = this.actor.bestCollegeSpellBonus(this.college, this.tags, tooltip)
			// levels += this.actor.spellBonusesFor("spell.power_source", this.powerSource, this.tags, tooltip)
			// levels += this.actor.spellBonusesFor("spell.name", this.name ?? "", this.tags, tooltip)
			// levels = Math.trunc(levels)
			skillLevel.level += levels
			skillLevel.relative_level += levels
			skillLevel.tooltip = tooltip
		}
		return {
			level: skillLevel.level,
			relative_level: skillLevel.relative_level,
			tooltip: skillLevel.tooltip.toString(),
		}
	}

	determineLevelForCollege(college: string): SkillLevel {
		const def = new SkillDefault({
			type: gid.Skill,
			name: this.baseSkill,
			specialization: college,
			modifier: -this.prereqCount,
		})
		if (college === "") def.name = ""
		const limit = 0
		const skillLevel = this.calculateLevelAsTechnique(def, college, limit)
		skillLevel.relative_level += def.modifier
		def.specialization = ""
		def.modifier -= 6
		const fallback = this.calculateLevelAsTechnique(def, college, limit)
		fallback.relative_level += def.modifier
		if (skillLevel.level >= def.modifier) return skillLevel
		return fallback
	}

	calculateLevelAsTechnique(def: SkillDefault, college: string, limit: number): SkillLevel {
		const tooltip = new TooltipGURPS()
		let relative_level = 0
		let points = this.adjustedPoints()
		let level = -Infinity
		if (this.actor) {
			if (def?.type === gid.Skill) {
				const sk = this.actor.baseSkill(def!, true)
				if (sk) level = sk.calculateLevel.level
			} else if (def) {
				level = (def?.skillLevelFast(this.actor, true, false, null) || 0) - (def?.modifier || 0)
			}
			if (level !== -Infinity) {
				const base_level = level
				level += def!.modifier // ?
				if (this.difficulty === "h") points -= 1
				if (points > 0) relative_level = points
				if (level !== -Infinity) {
					// Relative_level += this.actor.bonusFor(`skill.name/${this.name}`, tooltip)
					relative_level += this.actor.skillBonusFor(this.name!, college, this.tags, tooltip)
					level += relative_level
				}
				if (limit) {
					const max = base_level + limit
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
}

export interface RitualMagicSpellGURPS {
	readonly system: RitualMagicSpellData
}
