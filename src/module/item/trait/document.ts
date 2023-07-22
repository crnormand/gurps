import { ItemGCS } from "@item/gcs"
import { TraitModifierGURPS } from "@item/trait_modifier"
import { TraitModifierContainerGURPS } from "@item/trait_modifier_container"
import { CR, CRAdjustment, ItemType } from "@module/data"
import { inlineNote, LocalizeGURPS, SelfControl } from "@util"
import { TraitData } from "./data"

class TraitGURPS extends ItemGCS {
	unsatisfied_reason = ""

	// Getters
	get formattedName(): string {
		const name: string = this.name ?? ""
		const levels = this.levels
		return `${name}${levels ? ` ${levels}` : ""}`
	}

	override get notes(): string {
		const out: string[] = []
		if (inlineNote(this.actor, "user_description_display")) {
			if (this.system.userdesc) out.push(this.system.userdesc)
		}
		if (inlineNote(this.actor, "modifiers_display")) {
			if (out.length) out.push("<br>")
			if (this.cr !== 0) out.push(
				`<div data-item-id="${this.id}" data-type="control_roll" class="cr rollable">${
				 this.formattedCR
				 }</div>`
			)
			if (out.length) out.push("<br>")
			this.modifiers.filter(e => e.enabled).forEach((mod, i) => {
				if (i !== 0) out.push("; ")
				out.push(mod.name + (mod.system.notes ? `(${mod.system.notes})` : ""))
			})
		}
		if (inlineNote(this.actor, "notes_display")) {
			if (this.system.notes.trim()) {
				if (out.length) out.push("<br>")
				out.push(this.system.notes)
			}
			if (this.studyHours !== 0) {
				if (out.length) out.push("<br>")
				if (this.studyHours !== 0) out.push(LocalizeGURPS.format(
					LocalizeGURPS.translations.gurps.study.studied, {
					hours: this.studyHours,
					total: (this.system as any).study_hours_needed
				}))
			}
		}
		return `<div class="item-notes">${out.join("")}</div>`
	}

	get enabled(): boolean {
		if (this.system.disabled) return false
		let enabled = !this.system.disabled
		if (this.container && this.container.type === ItemType.TraitContainer)
			enabled = enabled && (this.container as any).enabled
		return enabled
	}

	set enabled(enabled: boolean) {
		this.system.disabled = !enabled
	}

	get isLeveled(): boolean {
		return this.system.can_level
	}

	get levels(): number {
		return this.system.levels ?? 0
	}

	get basePoints(): number {
		return this.system.base_points ?? 0
	}

	get pointsPerLevel(): number {
		return this.system.points_per_level ?? 0
	}

	get skillLevel(): number {
		return this.cr
	}

	get cr(): CR {
		return this.system.cr
	}

	get crAdj(): CRAdjustment {
		return this.system.cr_adj
	}

	get formattedCR(): string {
		let cr = ""
		if (this.cr !== CR.None) cr += game.i18n.localize(`gurps.select.cr_level.${this.cr}`)
		if (this.crAdj !== "none")
			cr += `, ${game.i18n.format(`gurps.select.cr_adj.${this.crAdj}`, {
				penalty: SelfControl.adjustment(this.cr, this.crAdj),
			})}`
		return cr
	}

	get roundCostDown(): boolean {
		return this.system.round_down
	}

	get modifierNotes(): string {
		let n = ""
		if (this.cr !== CR.None) {
			n += game.i18n.localize(`gurps.select.cr_level.${this.cr}`)
			if (this.crAdj !== "none") {
				n += `, ${game.i18n.format(`gurps.item.cr_adj_display.${this.crAdj}`, {
					penalty: "TODO",
				})}`
			}
		}
		for (const m of this.deepModifiers) {
			if (n.length) n += ";"
			n += m.fullDescription
		}
		return n
	}

	get adjustedPoints(): number {
		if (!this.enabled) return 0
		let baseEnh = 0
		let levelEnh = 0
		let baseLim = 0
		let levelLim = 0
		let basePoints = this.basePoints
		let pointsPerLevel = this.pointsPerLevel
		let multiplier = this.crMultiplier(this.cr)
		for (const mod of this.deepModifiers) {
			if (!mod.enabled) continue
			const modifier = mod.costModifier
			switch (mod.costType) {
				case "percentage":
					switch (mod.affects) {
						case "total":
							baseLim += modifier
							levelLim += modifier
							continue
						case "base_only":
							baseLim += modifier
							continue
						case "levels_only":
							levelLim += modifier
							continue
					}
				case "points":
					if (mod.affects === "levels_only") pointsPerLevel += modifier
					else basePoints += modifier
					continue
				case "multiplier":
					multiplier *= modifier
			}
		}
		let modifiedBasePoints = basePoints
		let leveledPoints = pointsPerLevel * this.levels
		if (baseEnh !== 0 || baseLim !== 0 || levelEnh !== 0 || levelLim !== 0) {
			if (this.actor?.settings.use_multiplicative_modifiers) {
				if (baseEnh === levelEnh && baseLim === levelLim) {
					modifiedBasePoints = TraitGURPS.modifyPoints(
						TraitGURPS.modifyPoints(modifiedBasePoints + leveledPoints, baseEnh),
						Math.max(-80, baseLim)
					)
				} else {
					modifiedBasePoints =
						TraitGURPS.modifyPoints(
							TraitGURPS.modifyPoints(modifiedBasePoints, baseEnh),
							Math.max(-80, baseLim)
						) +
						TraitGURPS.modifyPoints(
							TraitGURPS.modifyPoints(leveledPoints, levelEnh),
							Math.max(-80, levelLim)
						)
				}
			} else {
				let baseMod = Math.max(-80, baseEnh + baseLim)
				let levelMod = Math.max(-80, levelEnh + levelLim)
				if (baseMod === levelMod) {
					modifiedBasePoints = TraitGURPS.modifyPoints(modifiedBasePoints + leveledPoints, baseMod)
				} else {
					modifiedBasePoints =
						TraitGURPS.modifyPoints(modifiedBasePoints, baseMod) +
						TraitGURPS.modifyPoints(leveledPoints, levelMod)
				}
			}
		} else {
			modifiedBasePoints += leveledPoints
		}
		if (this.roundCostDown) return Math.floor(modifiedBasePoints * multiplier)
		else return Math.ceil(modifiedBasePoints * multiplier)
	}

	// Embedded Items
	get modifiers(): Collection<TraitModifierGURPS | TraitModifierContainerGURPS> {
		return new Collection(
			this.items
				.filter(item => item instanceof TraitModifierGURPS || item instanceof TraitModifierContainerGURPS)
				.map(item => {
					return [item.id!, item]
				})
		) as Collection<TraitModifierGURPS>
	}

	get deepModifiers(): Collection<TraitModifierGURPS> {
		const deepModifiers: Array<TraitModifierGURPS> = []
		for (const mod of this.modifiers) {
			if (mod instanceof TraitModifierGURPS) deepModifiers.push(mod)
			else
				for (const e of mod.deepItems) {
					if (e instanceof TraitModifierGURPS) deepModifiers.push(e)
				}
		}
		return new Collection(
			deepModifiers.map(item => {
				return [item.id!, item]
			})
		)
	}

	calculatePoints(): [number, number, number, number] {
		if (!this.enabled) return [0, 0, 0, 0]
		let [ad, disad, race, quirk] = [0, 0, 0, 0]
		let pts = this.adjustedPoints
		if (pts === -1) quirk += pts
		else if (pts > 0) ad += pts
		else if (pts < 0) disad += pts
		return [ad, disad, race, quirk]
	}

	crMultiplier(cr: CR): number {
		switch (cr) {
			case CR.None:
				return 1
			case CR.CR6:
				return 2
			case CR.CR9:
				return 1.5
			case CR.CR12:
				return 1
			case CR.CR15:
				return 0.5
			default:
				return this.crMultiplier(CR.None)
		}
	}

	toggleState(): void {
		this.enabled = !this.enabled
	}

	static modifyPoints(points: number, modifier: number): number {
		return points + TraitGURPS.calculateModifierPoints(points, modifier)
	}

	static calculateModifierPoints(points: number, modifier: number): number {
		return (points * modifier) / 100
	}
}

interface TraitGURPS {
	readonly system: TraitData
}

export { TraitGURPS }
