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
	applyTo: "HP" | "FP" | string

	/**
	 * Currently, the DamageCalculator only cares about "tbb" (tight beam burning).
	 */
	damageModifier: string

	/**
	 * A reference to the weapon used in the attack. Might be used to determine 1/2D for Ranged weapons, for example.
	 * Or DamageType, damageModifier, armorDivisor, rofMultiplier, ...
	 */
	weapon: DamageWeapon | null

	/**
	 * Value 1 = no Armor Divisor, 0 = Ignores DR; otherwise, it takes any non-negative value.
	 */
	armorDivisor: number

	/**
	 * The multiplier on the RoF, such as the "9" of 3x9. If none, should be equal to 1.
	 */
	rofMultiplier: number

	// === RANGE MODIFIERS ===
	// The creator of this DamageRoll could either set the "isHalfDamage" and/or "isShotgunCloseRange" flags, or
	// pass in both the weapon and the range to target, in which case we can calculate the values.

	range: number | null

	/**
	 * The attack is ranged, and the range to target is greater than the 1/2D range of the weapon.
	 * Alternately, include a reference to the weapon (from which we can get the 1/2D value) and the range to the
	 * target.
	 */
	isHalfDamage: boolean

	/**
	 * A weapon with a RoF multipler (such as RoF 3x9) is within 10% of 1/2D range.
	 */
	isShotgunCloseRange: boolean

	/**
	 * If greater than 1, this represents the level of the Vulnerability disadvantage to apply to the target of this
	 * attack. This value should always be greater than or equal to 1.
	 */
	vulnerability: number

	internalExplosion: boolean
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DamageAttacker {
	name: string
}

/**
 * An adapter on BaseWeapon and its subclasses that gives the DamageCalculator an easy interface to use.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DamageWeapon {}

enum DefaultHitLocations {
	Default = "Default",
	Random = "Random",
	LargeArea = "LargeArea",
}

export { DamageRoll, DamageAttacker, DefaultHitLocations, DamageWeapon }
