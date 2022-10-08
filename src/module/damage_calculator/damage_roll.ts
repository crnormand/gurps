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

	/**
	 * The attack is ranged, and the range to target is greater than the 1/2D range of the weapon.
	 * Alternately, include a reference to the weapon (from which we can get the 1/2D value) and the range to the
	 * target.
	 */
	isHalfDamage: boolean

	/**
	 * Currently, the DamageCalculator only cares about "tbb" (tight beam burning).
	 */
	damageModifier: string

	/**
	 * Value 1 = no Armor Divisor, 0 = Ignores DR; otherwise, it takes any non-negative value.
	 */
	armorDivisor: number

	/**
	 * A weapon with a RoF multipler (such as RoF 3x9) is within 10% of 1/2D range.
	 */
	isShotgunExtremeRange: boolean

	/**
	 * The multiplier on the RoF, such as the "9" of 3x9. If none, should be equal to 1.
	 */
	rofMultiplier: number
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DamageAttacker {}

enum DefaultHitLocations {
	Default = "Default",
	Random = "Random",
	LargeArea = "LargeArea",
}

export { DamageRoll, DamageAttacker, DefaultHitLocations }
