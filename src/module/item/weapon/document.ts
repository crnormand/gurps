import { SkillBonus } from "@feature"
import { BaseItemGURPS } from "@item/base"
import { Feature } from "@module/config"
import { ActorType, gid, ItemType } from "@module/data"
import { SkillDefault } from "@module/default"
import { TooltipGURPS } from "@module/tooltip"
import { i18n, stringCompare } from "@util"
import { WeaponDamage } from "./damage"
import { BaseWeaponSystemData } from "./data"

class BaseWeaponGURPS extends BaseItemGURPS {
	get itemName(): string {
		if (this.parent instanceof Item) return this.parent.name ?? ""
		return ""
	}

	get usage(): string {
		return this.system.usage
	}

	get strength(): string {
		return this.system.strength
	}

	override get actor(): (typeof CONFIG.GURPS.Actor.documentClasses)[ActorType.Character] | null {
		const actor = super.actor
		if (actor?.type === ActorType.Character) return actor
		return null
	}

	get notes(): string {
		let buffer = ""
		if (this.parent) buffer += this.parent.notes
		if ((this.system.usage_notes?.trim() ?? "") !== "") {
			if (buffer.length !== 0) buffer += "\n"
			buffer += this.system.usage_notes
		}
		return buffer
	}

	get level(): number {
		return this.skillLevel()
	}

	get equipped(): boolean {
		if (!this.actor) return false
		if ([ItemType.Equipment, ItemType.EquipmentContainer].includes(this.parent.type)) return this.parent.equipped
		if ([ItemType.Trait, ItemType.TraitContainer].includes(this.parent.type)) return this.parent.enabled
		return true
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

	skillLevel(tooltip?: TooltipGURPS): number {
		const actor = this.actor
		if (!actor) return 0
		let primaryTooltip = new TooltipGURPS()
		if (tooltip) primaryTooltip = tooltip
		const adj =
			this.skillLevelBaseAdjustment(actor, primaryTooltip) + this.skillLevelPostAdjustment(actor, primaryTooltip)
		let best = -Infinity
		for (const def of this.defaults) {
			let level = def.skillLevelFast(actor, false, true, null)
			if (level !== -Infinity) {
				level += adj
				if (best < level) best = level
			}
		}
		if (best === -Infinity) return 0
		if (tooltip && primaryTooltip && primaryTooltip.length !== 0) {
			if (tooltip.length !== 0) tooltip.push("\n")
			tooltip.push(primaryTooltip)
		}
		if (best < 0) best = 0
		return best
	}

	skillLevelBaseAdjustment(actor: this["actor"], tooltip: TooltipGURPS): number {
		let adj = 0
		const minST = this.resolvedMinimumStrength - (actor.strengthOrZero + actor.striking_st_bonus)
		if (minST > 0) adj -= minST
		const nameQualifier = this.parent.name
		for (const bonus of actor.namedWeaponSkillBonusesFor(nameQualifier!, this.usage, this.parent.tags, tooltip)) {
			adj += bonus.adjustedAmount
		}
		for (const bonus of actor.namedWeaponSkillBonusesFor(nameQualifier!, this.usage, this.parent.tags, tooltip)) {
			adj += bonus.adjustedAmount
		}
		for (const f of this.parent.features) {
			adj += this.extractSkillBonusForThisWeapon(f, tooltip)
		}
		if ([ItemType.Trait, ItemType.Equipment, ItemType.EquipmentContainer].includes(this.parent.type as any)) {
			for (const mod of (this.parent as any).modifiers) {
				for (const f of mod.features) {
					adj += this.extractSkillBonusForThisWeapon(f, tooltip)
				}
			}
		}
		return adj
	}

	skillLevelPostAdjustment(actor: this["actor"], tooltip: TooltipGURPS): number {
		if (this.type === ItemType.MeleeWeapon)
			if ((this as any).parry?.toLowerCase().includes("f")) return this.encumbrancePenalty(actor, tooltip)
		return 0
	}

	encumbrancePenalty(actor: this["actor"], tooltip: TooltipGURPS): number {
		if (!actor) return 0
		const penalty = actor.encumbranceLevel(true).penalty
		if (penalty !== 0 && tooltip) {
			tooltip.push("\n")
			tooltip.push(i18n("gurps.tooltip.encumbrance"))
			tooltip.push(` [${penalty.signedString()}]`)
		}
		return penalty
	}

	extractSkillBonusForThisWeapon(f: Feature, tooltip: TooltipGURPS): number {
		if (f instanceof SkillBonus) {
			if (f.selection_type === "this_weapon") {
				if (stringCompare(this.usage, f.specialization)) {
					f.addToTooltip(tooltip)
					return f.adjustedAmount
				}
			}
		}
		return 0
	}

	get resolvedMinimumStrength(): number {
		let started = false
		let value = 0
		for (const ch of this.system.strength) {
			if (ch.match(/[0-9]/)) {
				value *= 10
				value += parseInt(ch)
				started = true
			} else if (started) break
		}
		return value
	}

	get fastResolvedDamage(): string {
		return this.damage.resolvedDamage()
	}

	get damage(): WeaponDamage {
		return new WeaponDamage({ ...this.system.damage, parent: this })
	}

	resolvedValue(input: string, baseDefaultType: string, tooltip?: TooltipGURPS): string {
		const actor = this.actor
		input = input ?? ""
		if (!actor) return input
		let buffer = ""
		let skillLevel = -Infinity
		let line = input
		let max = line.length
		if (input !== "")
			for (let i = 0; i < max; i++) {
				max = line.length
				while (i < max && input[i] === " ") i++
				let ch = line[i]
				let neg = false
				let modifier = 0
				let found = false
				if (ch === "+" || ch === "-") {
					neg = ch === "-"
					i++
					if (i < max) ch = line[i]
				}
				while (i < max && ch.match("[0-9]")) {
					found = true
					modifier *= 10
					modifier += parseInt(ch)
					i++
					if (i < max) ch = line[i]
				}
				if (found) {
					if (skillLevel === -Infinity) {
						let primaryTooltip = new TooltipGURPS()
						let secondaryTooltip = new TooltipGURPS()
						if (tooltip) primaryTooltip = tooltip
						let preAdj = this.skillLevelBaseAdjustment(actor, primaryTooltip)
						let postAdj = this.skillLevelPostAdjustment(actor, primaryTooltip)
						let adj = 3
						if (baseDefaultType === gid.Parry) adj += actor.parryBonus
						else adj += actor.blockBonus
						let best = -Infinity
						for (const def of this.defaults) {
							let level = def.skillLevelFast(actor, false, true, null)
							if (level === -Infinity) continue
							level += preAdj
							if (baseDefaultType !== def.type) Math.trunc((level = level / 2 + adj))
							level === postAdj
							let possibleTooltip = new TooltipGURPS()
							if (def.type === gid.Skill && def.name === "Karate") {
								if (tooltip) possibleTooltip = tooltip
								level += this.encumbrancePenalty(actor, possibleTooltip)
							}
							if (best < level) {
								best = level
								secondaryTooltip = possibleTooltip
							}
						}
						if (best !== -Infinity && tooltip) {
							if (primaryTooltip && primaryTooltip.length !== 0) {
								if (tooltip.length !== 0) tooltip.push("\n")
								tooltip.push(primaryTooltip)
							}
							if (secondaryTooltip && primaryTooltip.length !== 0) {
								if (tooltip.length !== 0) tooltip.push("\n")
								tooltip.push(secondaryTooltip)
							}
						}
						skillLevel = Math.max(best, 0)
					}
					if (neg) modifier = -modifier
					const num = Math.trunc(skillLevel + modifier).toString()
					if (i < max) {
						buffer += num
						line = line.substring(i)
					} else line = num
				}
			}
		buffer += line
		return buffer
	}
}

interface BaseWeaponGURPS extends BaseItemGURPS {
	readonly system: BaseWeaponSystemData
}

export { BaseWeaponGURPS }
