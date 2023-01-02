import { Feature, WeaponDRDivisorBonus } from "@feature"
import { WeaponDamageBonus } from "@feature/weapon_bonus"
import { EquipmentContainerGURPS, EquipmentGURPS, TraitGURPS } from "@item"
import { DiceGURPS } from "@module/dice"
import { SkillDefault } from "@module/default"
import { TooltipGURPS } from "@module/tooltip"
import { stringCompare } from "@util"
import { Weapon } from "."
import { CharacterGURPS } from "@actor"

export class WeaponDamage {
	constructor(data?: (WeaponDamage & { parent: Weapon }) | any) {
		this.type = ""
		this.st = "none"
		// This.base = new DiceGURPS();
		this.armor_divisor = 1
		// This.fragmentation = new DiceGURPS();
		this.fragmentation_armor_divisor = 1
		this.fragmentation_type = ""
		this.modifier_per_die = 0
		if (data) {
			Object.assign(this, data)
			if (data.base) this.base = new DiceGURPS(data.base)
			if (data.fragmentation) this.fragmentation = new DiceGURPS(data.fragmentation)
		}
	}

	toString(): string {
		let buffer = ""
		if (this.st !== "none") buffer += this.resolveST(this.st)
		let convertMods = false
		if (this.parent && this.parent.actor) convertMods = this.parent.actor.settings.use_modifying_dice_plus_adds
		if (this.base) {
			let base = this.base.stringExtra(convertMods)
			if (base !== "0") {
				if (buffer.length !== 0 && base[0] !== "+" && base[0] !== "-") buffer += "+"
				buffer += base
			}
			if (this.armor_divisor !== 1) buffer += `(${this.armor_divisor})`
			if (this.modifier_per_die !== 0) {
				if (buffer.length !== 0) buffer += " "
				buffer += `(${this.modifier_per_die.signedString()} per die)`
			}
			const t = this.type.trim()
			if (t !== "") buffer += ` ${t}`
			if (this.fragmentation) {
				const frag = this.fragmentation.stringExtra(convertMods)
				if (frag !== "0") {
					buffer += `[${frag}`
					if (this.fragmentation_armor_divisor !== 1) buffer += `(${this.fragmentation_armor_divisor})`
					buffer += ` ${this.fragmentation_type}]`
				}
			}
		}
		return buffer
	}

	resolveST(st: StrengthDamage): string {
		switch (st) {
			case "none":
				return "None"
			case "thr":
				return "thr"
			case "thr_leveled":
				return "thr (leveled)"
			case "sw":
				return "sw"
			case "sw_leveled":
				return "sw_leveled"
		}
	}

	resolvedDamage(tooltip?: TooltipGURPS): string {
		const parent = this.parent
		if (!parent) return this.toString()
		const actor: CharacterGURPS = this.parent.actor
		if (!actor) return this.toString()
		const maxST = this.parent.resolvedMinimumStrength * 3
		let st = actor.strengthOrZero + actor.striking_st_bonus
		if (maxST > 0 && maxST < st) st = maxST
		let base = new DiceGURPS({ sides: 6, multiplier: 1 })
		if (this.base) base = this.base
		const t = this.parent.parent
		let levels = 0
		if (t instanceof TraitGURPS && t.isLeveled) {
			levels = t.levels
			multiplyDice(t.levels, base)
		}
		let intST = Math.trunc(st)
		switch (this.st) {
			case "thr":
				base = addDice(base, actor.thrustFor(intST))
				break
			case "thr_leveled":
				let thrust = actor.thrustFor(intST)
				if (t instanceof TraitGURPS && t.isLeveled) multiplyDice(Math.trunc(t.levels), thrust)
				base = addDice(base, thrust)
				break
			case "sw":
				base = addDice(base, actor.swingFor(intST))
				break
			case "sw_leveled":
				let swing = actor.swingFor(intST)
				if (t instanceof TraitGURPS && t.isLeveled) multiplyDice(Math.trunc(t.levels), swing)
				base = addDice(base, swing)
		}
		let bestDefault: SkillDefault | null = null
		let best = -Infinity
		for (const d of this.parent.defaults) {
			if (d.skillBased) {
				let level = d.skillLevelFast(actor, false, true, null)
				if (best < level) {
					best = level
					bestDefault = d
				}
			}
		}
		let bonusSet: Map<WeaponDamageBonus, boolean> = new Map()
		let tags = this.parent.parent.tags
		if (bestDefault) {
			actor.addWeaponWithSkillBonusesFor(
				bestDefault.name!,
				bestDefault.specialization!,
				tags,
				base.count,
				levels,
				tooltip,
				bonusSet
			)
			// Actor.addNamedWeaponBonusesFor(
			// 	bestDefault.name!,
			// 	bestDefault.specialization!,
			// 	tags,
			// 	base.count,
			// 	levels,
			// 	tooltip,
			// 	bonusSet
			// )
		}
		const nameQualifier = this.parent.name
		actor.addNamedWeaponBonusesFor(nameQualifier, this.parent.usage, tags, base.count, levels, tooltip, bonusSet)
		for (const f of this.parent.parent.features) {
			this.extractWeaponBonus(f, bonusSet, base.count, levels, tooltip)
		}
		if (t instanceof TraitGURPS || t instanceof EquipmentGURPS || t instanceof EquipmentContainerGURPS) {
			for (const mod of t.modifiers) {
				for (const f of mod.features) {
					this.extractWeaponBonus(f, bonusSet, base.count, levels, tooltip)
				}
			}
		}
		const adjustForPhoenixFlame = actor.settings.damage_progression === "phoenix_flame_d3" && base.sides === 3
		let [percentDamageBonus, percentDRDivisorBonus] = [0, 0]
		let armorDivisor = this.armor_divisor
		for (const bonus of bonusSet.keys()) {
			if (bonus.type === "weapon_bonus") {
				if (bonus.percent) percentDamageBonus += bonus.amount
				else {
					let amount = bonus.amount
					if (bonus.per_level) {
						amount *= base.count
						if (adjustForPhoenixFlame) amount /= 2
					}
					base.modifier += Math.trunc(amount)
				}
			} else if (bonus.percent) percentDRDivisorBonus += bonus.amount
			else {
				let amount = bonus.amount
				if (bonus.per_level) {
					amount *= base.count
				}
				armorDivisor += amount
			}
		}
		if (this.modifier_per_die !== 0) {
			let amount = this.modifier_per_die * base.count
			if (adjustForPhoenixFlame) amount /= 2
			base.modifier += Math.trunc(amount)
		}
		if (percentDamageBonus !== 0) base = adjustDiceForPercentBonus(base, percentDamageBonus)
		if (percentDRDivisorBonus !== 0) armorDivisor = (armorDivisor * percentDRDivisorBonus) / 100
		let buffer = ""
		if (base.count !== 0 || base.modifier !== 0) {
			buffer += base.stringExtra(actor.settings.use_modifying_dice_plus_adds)
		}
		if (armorDivisor !== 1) buffer += `(${armorDivisor})`
		if (this.type.trim() !== "") {
			if (buffer.length !== 0) buffer += " "
			buffer += this.type
		}
		if (this.fragmentation) {
			let frag = this.fragmentation.stringExtra(actor.settings.use_modifying_dice_plus_adds)
			if (frag !== "0") {
				if (buffer.length !== 0) buffer += " "
				buffer += `[${frag}`
				if (this.fragmentation_armor_divisor !== 1) buffer += `(${this.fragmentation_armor_divisor})`
				buffer += ` ${this.fragmentation_type}]`
			}
		}
		return buffer
	}

	extractWeaponBonus(
		f: Feature,
		set: Map<WeaponDamageBonus | WeaponDRDivisorBonus, boolean>,
		dieCount: number,
		levels: number,
		tooltip?: TooltipGURPS
	): void {
		if (f instanceof WeaponDamageBonus || f instanceof WeaponDRDivisorBonus) {
			const level = f.levels
			f.levels = f instanceof WeaponDamageBonus ? dieCount : levels
			switch (f.selection_type) {
				case "weapons_with_required_skill":
					break
				case "this_weapon":
					if (stringCompare(this.parent.usage, f.specialization)) {
						if (!set.has(f)) {
							set.set(f, true)
							f.addToTooltip(tooltip)
						}
					}
					break
				case "weapons_with_name":
					if (
						stringCompare(this.parent.name, f.name) &&
						stringCompare(this.parent.usage, f.specialization) &&
						stringCompare(this.parent.parent.tags, f.tags)
					) {
						if (!set.has(f)) {
							set.set(f, true)
							f.addToTooltip(tooltip)
						}
					}
					break
			}
			f.levels = level
		}
	}
}

/**
 *
 * @param multiplier
 * @param d
 */
function multiplyDice(multiplier: number, d: DiceGURPS): void {
	d.count *= multiplier
	d.modifier *= multiplier
	if (d.multiplier !== 1) d.multiplier *= multiplier
}

/**
 *
 * @param left
 * @param right
 */
function addDice(left: DiceGURPS, right: DiceGURPS): DiceGURPS {
	if (left.sides > 1 && right.sides > 1 && left.sides !== right.sides) {
		const sides = Math.min(left.sides, right.sides)
		const average = (sides + 1) / 2
		const averageLeft = ((left.count * (left.sides + 1)) / 2) * left.multiplier
		const averageRight = ((right.count * (right.sides + 1)) / 2) * right.multiplier
		const averageBoth = averageLeft + averageRight
		return new DiceGURPS({
			count: Math.trunc(averageBoth / average),
			sides: sides,
			modifier: Math.round(averageBoth % average) + left.modifier + right.modifier,
			multiplier: 1,
		})
	}
	return new DiceGURPS({
		count: left.count + right.count,
		sides: Math.max(left.sides, right.sides),
		modifier: left.modifier + right.modifier,
		multiplier: left.multiplier + right.multiplier - 1,
	})
}

/**
 *
 * @param d
 * @param percent
 */
function adjustDiceForPercentBonus(d: DiceGURPS, percent: number): DiceGURPS {
	let count = d.count
	let modifier = d.modifier
	const averagePerDie = (d.sides + 1) / 2
	let average = averagePerDie * count + modifier
	modifier = (modifier * (100 + percent)) / 100
	if (average < 0) count = Math.max((count * (100 + percent)) / 100, 0)
	else {
		average = (average * (100 + percent)) / 100 - modifier
		count = Math.max(Math.trunc(average / averagePerDie), 0)
		modifier += Math.round(average - count * averagePerDie)
	}
	return new DiceGURPS({
		count: count,
		sides: d.sides,
		modifier: modifier,
		multiplier: d.multiplier,
	})
}

export interface WeaponDamage {
	parent: Weapon | any
	type: string
	st: StrengthDamage
	base: DiceGURPS
	armor_divisor: number
	fragmentation: DiceGURPS
	fragmentation_armor_divisor: number
	fragmentation_type: string
	modifier_per_die: number
}

export type StrengthDamage = "none" | "thr" | "thr_leveled" | "sw" | "sw_leveled"
