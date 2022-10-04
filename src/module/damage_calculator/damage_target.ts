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
	getTrait(name: string): TraitGURPSAdapter | undefined
	//
	hasTrait(name: string): boolean
	// This.hasTrait("Injury Tolerance (Unliving)").
	isUnliving: boolean
	// This.hasTrait("Injury Tolerance (Homogenous)").
	isHomogenous: boolean
	// This.hasTrait("Injury Tolerance (Diffuse)").
	isDiffuse: boolean
}

class TraitGURPSAdapter {
	levels = 0

	name = ""

	constructor(name: string, levels: number) {
		this.levels = levels
		this.name = name
	}
}

export { DamageTarget, TraitGURPSAdapter }
