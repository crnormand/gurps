import { ItemGCS } from "@item/gcs"
import { ActorType, Difficulty, gid } from "@module/data"
import { SkillDefault } from "@module/default"
import { TooltipGURPS } from "@module/tooltip"
import { difficultyRelativeLevel, inlineNote, LocalizeGURPS } from "@util"
import { SkillData, SkillLevel } from "./data"

class SkillGURPS extends ItemGCS {
	level: SkillLevel = { level: 0, relative_level: 0, tooltip: new TooltipGURPS() }

	unsatisfied_reason = ""

	private _dummyActor: (typeof CONFIG.GURPS.Actor.documentClasses)[ActorType.Character] | null = null

	// Getters
	get formattedName(): string {
		const name: string = this.name ?? ""
		const specialization = this.specialization
		const TL = this.techLevel
		return `${name}${this.system.tech_level_required ? `/TL${TL ?? ""}` : ""}${
			specialization ? ` (${specialization})` : ""
		}`
	}

	override get notes(): string {
		const out: string[] = []
		if (inlineNote(this.actor, "modifiers_display")) {
			if (this.difficulty !== Difficulty.Wildcard && this.defaultSkill) {
				out.push(
					LocalizeGURPS.format(LocalizeGURPS.translations.gurps.item.default, {
						skill: this.defaultSkill.formattedName,
						modifier: `${this.defaultedFrom!.modifier}`,
					})
				)
			}
		}
		if (inlineNote(this.actor, "notes_display")) {
			if (this.system.notes.trim()) {
				if (out.length) out.push("<br>")
				out.push(this.system.notes)
			}
			if (this.studyHours !== 0) {
				if (out.length) out.push("<br>")
				if (this.studyHours !== 0)
					out.push(
						LocalizeGURPS.format(LocalizeGURPS.translations.gurps.study.studied, {
							hours: this.studyHours,
							total: (this.system as any).study_hours_needed,
						})
					)
			}
		}
		if (inlineNote(this.actor, "skill_level_adj_display")) {
			if (this.level.tooltip.length) {
				if (out.length) out.push("<br>")
				out.push(this.level.tooltip.toString())
			}
		}
		return `<div class="item-notes">${out.join("")}</div>`
	}

	get points(): number {
		return this.system.points
	}

	set points(n: number) {
		this.system.points = n
	}

	get techLevel(): string {
		return this.system.tech_level
	}

	get attribute(): string {
		return this.system.difficulty?.split("/")[0] ?? gid.Dexterity
	}

	get difficulty(): Difficulty {
		return (this.system.difficulty?.split("/")[1] as Difficulty) ?? Difficulty.Average
	}

	get specialization(): string {
		return this.system.specialization
	}

	get defaultSkill(): SkillGURPS | undefined {
		if (!this.actor) return undefined
		return this.actor.baseSkill(this.defaultedFrom, true)
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

	get effectiveLevel(): number {
		const actor = this.actor || this.dummyActor
		if (!actor) return -Infinity
		let att = actor.resolveAttributeCurrent(this.attribute)
		let effectiveAtt = actor.resolveAttributeEffective(this.attribute)
		return this.calculateLevel().level - att + effectiveAtt
	}

	// Used for defaults
	get dummyActor(): (typeof CONFIG.GURPS.Actor.documentClasses)[ActorType.Character] | null {
		return this._dummyActor
	}

	set dummyActor(actor: (typeof CONFIG.GURPS.Actor.documentClasses)[ActorType.Character] | null) {
		this._dummyActor = actor
	}

	// Point & Level Manipulation
	calculateLevel(): SkillLevel {
		const none = { level: -Infinity, relative_level: 0, tooltip: new TooltipGURPS() }
		const actor = this.actor || this.dummyActor
		if (!actor) return none
		let relative_level = difficultyRelativeLevel(this.difficulty)
		let level = actor.resolveAttributeCurrent(this.attribute)
		const tooltip = new TooltipGURPS()
		let points = this.adjustedPoints(tooltip)
		const def = this.defaultedFrom
		if (level === -Infinity) return none
		if (actor.settings.use_half_stat_defaults) {
			level = Math.trunc(level / 2) + 5
		}
		if (this.difficulty === Difficulty.Wildcard) points /= 3
		else if (def && def.points > 0) points += def.points
		points = Math.trunc(points)

		switch (true) {
			case points === 1:
				// Relative_level is preset to this point value
				break
			case points > 1 && points < 4:
				relative_level += 1
				break
			case points >= 4:
				relative_level += 1 + Math.floor(points / 4)
				break
			case this.difficulty !== Difficulty.Wildcard && def && def.points < 0:
				relative_level = def!.adjustedLevel - level
				break
			default:
				level = -Infinity
				relative_level = 0
		}
		if (level === -Infinity) return none
		level += relative_level
		if (this.difficulty !== Difficulty.Wildcard && def && level < def.adjustedLevel) {
			level = def.adjustedLevel
		}
		let bonus = actor.skillBonusFor(this.name!, this.specialization, this.tags, tooltip)
		const encumbrancePenalty = actor.encumbranceLevel(true).penalty * this.encumbrancePenaltyMultiplier
		level += bonus + encumbrancePenalty
		relative_level += bonus + encumbrancePenalty
		if (bonus !== 0) {
			tooltip.push("TO DO")
		}
		return {
			level: level,
			relative_level: relative_level,
			tooltip: tooltip,
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

	updateLevel(): boolean {
		const saved = this.level
		this.defaultedFrom = this.bestDefaultWithPoints()
		this.level = this.calculateLevel()
		return saved.level !== this.level.level
	}

	bestDefaultWithPoints(_excluded?: SkillDefault): SkillDefault | undefined {
		const actor = this.actor || this.dummyActor
		if (!actor) return
		const best = this.bestDefault()
		if (best) {
			const baseline = actor.resolveAttributeCurrent(this.attribute) + difficultyRelativeLevel(this.difficulty)
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
		const actor = this.actor || this.dummyActor
		if (!actor || !this.defaults) return
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
		const actor = this.actor || this.dummyActor
		let level = def.skillLevel(actor!, true, excludes, this.type.startsWith("skill"))
		if (def.skillBased) {
			const other = actor?.bestSkillNamed(def.name!, def.specialization!, true, excludes)
			if (other) {
				level -= actor!.skillBonusFor(def.name!, def.specialization!, this.tags, undefined)
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

interface SkillGURPS extends ItemGCS {
	readonly system: SkillData
}

export { SkillGURPS }
