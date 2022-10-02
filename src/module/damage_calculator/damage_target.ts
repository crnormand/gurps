import { TraitGURPS } from "@item"
import { HitLocationTableWithCalc } from "./hit_location"

/**
 * The target of a damage roll.
 *
 * Most commonly implemented as a CharacterGURPS adapter/façade.
 */
type HitPointsCalc = { value: number; current: number }

interface DamageTarget {
	// CharacterGURPS.attributes.get(gid.ST).calc.value
	ST: number
	// CharacterGURPS.attributes.get(gid.HitPoints).calc
	hitPoints: HitPointsCalc
	// CharacterGURPS.system.settings.body_type
	// TODO It would be better to have a method to return DR directly; this would allow DR overrides.
	hitLocationTable: HitLocationTableWithCalc
	// CharacterGURPS.traits.contents.filter(it => it instanceof TraitGURPS)
	traits: Array<TraitGURPS>
	//
	hasTrait(name: string): boolean
	// This.hasTrait("Injury Tolerance (Unliving)").
	isUnliving: boolean
	// This.hasTrait("Injury Tolerance (Homogenous)").
	isHomogenous: boolean
	// This.hasTrait("Injury Tolerance (Diffuse)").
	isDiffuse: boolean
}

export { DamageTarget }
