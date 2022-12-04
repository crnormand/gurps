import { BaseActorGURPS } from "../actor/index"
import { TraitGURPS } from "../item/trait/index"
import { TraitModifierGURPS } from "../item/trait_modifier/index"
import { HitLocationTable } from "@actor/character/hit_location"

/**
 * The target of a damage roll.
 *
 * Most commonly implemented as a CharacterGURPS adapter/façade.
 */
type HitPointsCalc = { value: number; current: number }

const createDamageTarget = function (actor: BaseActorGURPS): DamageTarget {
	return new DamageTargetActor(actor)
}

interface DamageTarget {
	name: string
	// CharacterGURPS.attributes.get(gid.ST).calc.value
	ST: number
	// CharacterGURPS.attributes.get(gid.HitPoints).calc
	hitPoints: HitPointsCalc
	// CharacterGURPS.system.settings.body_type
	// TODO It would be better to have a method to return DR directly; this would allow DR overrides.
	hitLocationTable: HitLocationTable
	// CharacterGURPS.traits.contents.filter(it => it instanceof TraitGURPS)
	getTrait(name: string): TargetTrait | undefined
	//
	hasTrait(name: string): boolean
	// This.hasTrait("Injury Tolerance (Unliving)").
	isUnliving: boolean
	// This.hasTrait("Injury Tolerance (Homogenous)").
	isHomogenous: boolean
	// This.hasTrait("Injury Tolerance (Diffuse)").
	isDiffuse: boolean
}

interface TargetTrait {
	getModifier(name: string): TargetTraitModifier | undefined
	levels: number
	name: string | null
	modifiers: TargetTraitModifier[]
}

interface TargetTraitModifier {
	levels: number
	name: string
}

class TraitModifierAdapter implements TargetTraitModifier {
	private modifier: TraitModifierGURPS

	get levels() {
		return this.modifier.levels
	}

	name = ""

	constructor(modifier: TraitModifierGURPS) {
		this.modifier = modifier
	}
}

class TraitAdapter implements TargetTrait {
	private trait: TraitGURPS

	getModifier(name: string): TraitModifierAdapter | undefined {
		return this.modifiers.find(it => it.name === name)
	}

	get levels() {
		return this.trait.levels
	}

	get name() {
		return this.trait.name
	}

	get modifiers(): TraitModifierAdapter[] {
		return this.trait.modifiers.contents
			.filter(it => it instanceof TraitModifierGURPS)
			.map(it => new TraitModifierAdapter(it as TraitModifierGURPS))
	}

	constructor(trait: TraitGURPS) {
		this.trait = trait
	}
}

class DamageTargetActor implements DamageTarget {
	static DamageReduction = "Damage Reduction"

	private actor: BaseActorGURPS

	constructor(actor: BaseActorGURPS) {
		this.actor = actor
	}

	get name(): string {
		return this.actor.name ?? ""
	}

	get ST(): number {
		// @ts-ignore
		return this.actor.attributes.get("st")?.calc.value
	}

	get hitPoints(): HitPointsCalc {
		// @ts-ignore
		return this.actor.attributes.get("hp")?.calc
	}

	get hitLocationTable(): HitLocationTable {
		// @ts-ignore
		return this.actor.system.settings.body_type
	}

	/**
	 * This is where we would add special handling to look for traits under different names.
	 * @param name
	 */
	getTrait(name: string): TargetTrait | undefined {
		if (this.actor instanceof BaseActorGURPS) {
			let traits = this.actor.traits.contents.filter(it => it instanceof TraitGURPS)
			let found = traits.find(it => it.name === name)
			return new TraitAdapter(found as TraitGURPS)
		}
	}

	hasTrait(name: string): boolean {
		return !!this.getTrait(name)
	}

	get isUnliving(): boolean {
		// Try "Injury Tolerance (Unliving)" and "Unliving"
		if (this.hasTrait("Unliving")) return true
		if (!this.hasTrait("Injury Tolerance")) return false
		let trait = this.getTrait("Injury Tolerance")
		return !!trait?.getModifier("Unliving")
	}

	get isHomogenous(): boolean {
		if (this.hasTrait("Homogenous")) return true
		if (!this.hasTrait("Injury Tolerance")) return false
		let trait = this.getTrait("Injury Tolerance")
		return !!trait?.getModifier("Homogenous")
	}

	get isDiffuse(): boolean {
		if (this.hasTrait("Diffuse")) return true
		if (!this.hasTrait("Injury Tolerance")) return false
		let trait = this.getTrait("Injury Tolerance")
		return !!trait?.getModifier("Diffuse")
	}
}

export { createDamageTarget, DamageTarget, TargetTrait, TargetTraitModifier }
