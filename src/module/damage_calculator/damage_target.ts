import { HitLocationTable } from "@actor/character/hit_location"

/**
 * Contains the interface definition(s) needed for the DamageTarget used by the DamageCalculator.
 *
 * Each component that can be used as a "damage target" needs to implement these interfaces. Those definitions should be
 * in their own files/directory, not inside the damage_calculator directory. (This is to ensure the dependencies are
 * pointing in the "correct direction".)
 */

export type HitPointsCalc = { value: number; current: number }

export interface DamageTarget {
	name: string
	// CharacterGURPS.attributes.get(gid.ST).calc.value
	ST: number
	// CharacterGURPS.attributes.get(gid.HitPoints).calc
	hitPoints: HitPointsCalc
	// CharacterGURPS.system.settings.body_type
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

export interface TargetTrait {
	getModifier(name: string): TargetTraitModifier | undefined
	levels: number
	name: string | null
	modifiers: TargetTraitModifier[]
}

export interface TargetTraitModifier {
	levels: number
	name: string
}
