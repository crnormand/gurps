import { DiceGURPS } from "@module/dice"
import { DamageType } from "./damage_type"

/**
 * DamageRoll is the parameter that is sent in (along with DamageTarget) to the DamageCalculator.
 */
interface DamageRoll {
	/**
	 * The body_plan location id, or "Default" or "Random". The DamageCalculator will resolve "Default" or "Random" to
	 * a real location id.
	 */
	locationId: string | DefaultHitLocations

	attacker: DamageAttacker
	dice: DiceGURPS
	basicDamage: number
	damageType: DamageType
	isHalfDamage: boolean

	/**
	 * Currently, the DamageCalculator only cares about "tbb" (tight beam burning).
	 */
	damageModifier: string

	/**
	 * Value 1 = no Armor Divisor, 0 = Ignores DR; otherwise, it takes any non-negative value.
	 */
	armorDivisor: number
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DamageAttacker {}

enum DefaultHitLocations {
	Default = "Default",
	Random = "Random",
	LargeArea = "LargeArea",
}

export { DamageRoll, DamageAttacker, DefaultHitLocations }
