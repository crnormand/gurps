import { ItemGCS } from "@item/gcs"
import { SkillLevel } from "@item/skill/data"
import { Difficulty, gid } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { difficultyRelativeLevel, inlineNote, LocalizeGURPS } from "@util"
import { SpellData } from "./data"

class SpellGURPS extends ItemGCS {
	level: SkillLevel = { level: 0, relative_level: 0, tooltip: new TooltipGURPS() }

	unsatisfied_reason = ""

	// Static get schema(): typeof SpellData {
	// 	return SpellData;
	// }
	get formattedName(): string {
		const name: string = this.name ?? ""
		const TL = this.techLevel
		return `${name}${this.system.tech_level_required ? `/TL${TL ?? ""}` : ""}`
	}

	override get notes(): string {
		const out: string[] = []
		if (inlineNote(this.actor, "notes_display")) {
			if (this.system.notes.trim())
				out.push(this.system.notes)
			if (this.rituals) {
				if (out.length) out.push("<br>")
				out.push(this.rituals)
			}
			if (this.studyHours !== 0) {
				if (out.length) out.push("<br>")
				if (this.studyHours !== 0) out.push(LocalizeGURPS.format(
					LocalizeGURPS.translations.gurps.study.studied, {
					hours: this.studyHours,
					total: (this.system as any).study_hours_needed
				}))
			}
			if (inlineNote(this.actor, "skill_level_adj_display")) {
				if (this.level.tooltip.length) {
					if (out.length) out.push("<br>")
					out.push(this.level.tooltip.toString())
				}
			}
		}
		if (out.length) out.push("<br>")
		const values = {
			resist: this.system.resist,
			spell_class: this.system.spell_class,
			casting_cost: this.system.casting_cost,
			maintenance_cost: this.system.maintenance_cost,
			casting_time: this.system.casting_time,
			duration: this.system.duration,
			college: this.system.college.join(", "),
		}
		const list = []
		for (const [k, v] of Object.entries(values)) {
			if (v && v !== "" && v !== "-") list.push(`${game.i18n.localize(`gurps.character.spells.${k}`)}: ${v}`)
		}
		out.push(list.join("; "))
		return `<div class="item-notes">${out.join("")}</div>`
	}

	get rituals(): string {
		if (!this.actor) return ""
		const level = this.level.level
		switch (true) {
			case (level < 10):
				return LocalizeGURPS.translations.gurps.ritual.sub_10
			case (level < 15):
				return LocalizeGURPS.translations.gurps.ritual.sub_15
			case (level < 20):
				let ritual = LocalizeGURPS.translations.gurps.ritual.sub_20
				// TODO:
				if (this.system.spell_class.toLowerCase() === "blocking") return ritual
				ritual += LocalizeGURPS.format(
					LocalizeGURPS.translations.gurps.ritual.cost,
					{
						adj: 1
					}
				)
				return ritual
			default:
				const adj = Math.trunc((level - 15) / 5)
				const spell_class = this.system.spell_class.toLowerCase()
				let time = ""
				if (!spell_class.includes("missile")) time = LocalizeGURPS.format(
					LocalizeGURPS.translations.gurps.ritual.time,
					{
						adj: Math.pow(2, adj)
					}
				)
				let cost = ""
				if (!spell_class.includes("blocking")) {
					cost = LocalizeGURPS.format(
						LocalizeGURPS.translations.gurps.ritual.cost,
						{
							adj: adj + 1
						}
					)
				}
				return LocalizeGURPS.translations.gurps.ritual.none + time + cost
		}
	}

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

	get defaultedFrom(): null {
		return null
	}

	adjustedPoints(tooltip?: TooltipGURPS): number {
		let points = this.points
		if (this.actor) {
			points += this.actor.spellPointBonusesFor(this.name!, this.powerSource, this.college, this.tags, tooltip)
			points = Math.max(points, 0)
		}
		return points
	}

	get skillLevel(): string {
		// if (this.calculateLevel().level === -Infinity) return "-"
		// return this.calculateLevel().level.toString()
		if (this.effectiveLevel === -Infinity) return "-"
		return this.effectiveLevel.toString()
	}

	get relativeLevel(): string {
		if (this.calculateLevel().level === -Infinity) return "-"
		return (
			(this.actor?.attributes?.get(this.attribute)?.attribute_def.name ?? "") +
			this.calculateLevel().relative_level.signedString()
		)
	}

	// Point & Level Manipulation
	updateLevel(): boolean {
		const saved = this.level
		this.level = this.calculateLevel()
		return saved.level !== this.level.level
	}

	get effectiveLevel(): number {
		if (!this.actor) return -Infinity
		let att = this.actor.resolveAttributeCurrent(this.attribute)
		let effectiveAtt = this.actor.resolveAttributeEffective(this.attribute)
		return this.calculateLevel().level - att + effectiveAtt
	}

	calculateLevel(): SkillLevel {
		const tooltip = new TooltipGURPS()
		let relativeLevel = difficultyRelativeLevel(this.system.difficulty)
		let level = -Infinity
		if (this.actor) {
			let points = Math.trunc(this.points)
			level = this.actor.resolveAttributeCurrent(this.attribute)
			if (this.system.difficulty === Difficulty.Wildcard) points = Math.trunc(points / 3)
			if (points < 1) {
				level = -Infinity
				relativeLevel = 0
			} else if (points === 0) {
				// Do nothing
			} else if (points < 4) {
				relativeLevel += 1
			} else {
				relativeLevel += 1 + Math.trunc(points / 4)
			}
			if (level !== -Infinity) {
				relativeLevel += this.actor.spellBonusFor(
					this.name!,
					this.powerSource,
					this.college,
					this.tags,
					tooltip
				)
				relativeLevel = Math.trunc(relativeLevel)
				level += relativeLevel
			}
		}
		return {
			level: level,
			relative_level: relativeLevel,
			tooltip: tooltip
		}
	}

	incrementSkillLevel() {
		const basePoints = this.points + 1
		let maxPoints = basePoints
		if (this.difficulty === Difficulty.Wildcard) maxPoints += 12
		else maxPoints += 4

		const oldLevel = this.calculateLevel().level
		for (let points = basePoints; points < maxPoints; points++) {
			this.system.points = points
			if (this.calculateLevel().level > oldLevel) {
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

		let oldLevel = this.calculateLevel().level
		for (let points = basePoints; points >= minPoints; points--) {
			this.system.points = points
			if (this.calculateLevel().level < oldLevel) {
				break
			}
		}

		if (this.points > 0) {
			let oldLevel = this.calculateLevel().level
			while (this.points > 0) {
				this.system.points = Math.max(this.points - 1, 0)
				if (this.calculateLevel().level !== oldLevel) {
					this.system.points++
					return this.update({ "system.points": this.points })
				}
			}
		}
	}
}

interface SpellGURPS {
	readonly system: SpellData
}

export { SpellGURPS }
