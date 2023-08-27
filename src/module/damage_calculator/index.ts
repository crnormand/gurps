import { DiceGURPS } from "../dice"
import { DamageType, DamageTypes } from "./damage_type"
import { HitLocationTable } from "@actor/character/hit_location"
import { DamagePayload } from "./damage_chat_message"
import { SETTINGS, SYSTEM_NAME } from "../data"

/**
 * DamageRoll is the parameter that is sent in (along with DamageTarget) to the DamageCalculator.
 */
interface DamageRoll {
	/**
	 * The body_plan location id, or "Default" or "Random". The DamageCalculator will resolve "Default" or "Random" to
	 * a real location id.
	 */
	locationId: string | DefaultHitLocations

	attacker: DamageAttacker | undefined
	dice: DiceGURPS
	damageText: string
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
	weapon: DamageWeapon | undefined

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

	internalExplosion: boolean
}

interface DamageAttacker {
	name: string | null
}

/**
 * An adapter on BaseWeapon and its subclasses that gives the DamageCalculator an easy interface to use.
 */
interface DamageWeapon {
	name: string

	damageDice: string
}

enum DefaultHitLocations {
	Default = "Default",
	Random = "Random",
	LargeArea = "LargeArea",
}
class DamageRollAdapter implements DamageRoll {
	private _payload: DamagePayload

	private _locationId: string

	constructor(payload: DamagePayload, attacker: DamageAttacker | undefined, weapon: DamageWeapon | undefined) {
		this._payload = payload

		this.attacker = attacker
		this._locationId = payload.hitlocation
		console.log(`location = ${this._locationId}`)

		this.weapon = weapon

		this.internalExplosion = false
		this.applyTo = ""

		this.rofMultiplier = 1
		this.range = null
		this.isHalfDamage = false
		this.isShotgunCloseRange = false
		this.vulnerability = 1
	}

	get locationId(): string {
		switch (this._locationId) {
			case undefined:
			case DefaultHitLocations.Default:
				// Set to default value from world settings.
				this._locationId =
					(game.settings.get(SYSTEM_NAME, SETTINGS.DEFAULT_DAMAGE_LOCATION) as string) ?? "torso"
				break
		}

		return this._locationId
	}

	set locationId(id: string) {
		this._locationId = id
	}

	attacker: DamageAttacker | undefined

	get dice(): DiceGURPS {
		return this._payload.dice
	}

	get damageText(): string {
		return this._payload.damage
	}

	get basicDamage(): number {
		return this._payload.total
	}

	get armorDivisor(): number {
		return this._payload.armorDivisor ?? 1
	}

	get damageType(): DamageType {
		return (DamageTypes as any)[this._payload.damageType]
	}

	get damageModifier(): string {
		return this._payload.damageModifier
	}

	applyTo: string

	weapon: DamageWeapon | undefined

	rofMultiplier: number

	range: number | null

	isHalfDamage: boolean

	isShotgunCloseRange: boolean

	vulnerability: number

	internalExplosion: boolean
}

/**
 * Contains the interface definition(s) needed for the DamageTarget used by the DamageCalculator.
 *
 * Each component that can be used as a "damage target" needs to implement these interfaces. Those definitions should be
 * in their own files/directory, not inside the damage_calculator directory. (This is to ensure the dependencies are
 * pointing in the "correct direction".)
 */

export type HitPointsCalc = { value: number; current: number }
export type Vulnerability = { name: string; value: number; apply: boolean }

export interface DamageTarget {
	name: string
	// CharacterGURPS.attributes.get(gid.ST).calc.value
	ST: number
	// CharacterGURPS.attributes.get(gid.HitPoints).calc
	hitPoints: HitPointsCalc
	// CharacterGURPS.BodyType
	hitLocationTable: HitLocationTable
	// CharacterGURPS.traits.contents.filter(it => it instanceof TraitGURPS)
	getTrait(name: string): TargetTrait | undefined
	// CharacterGURPS.traits.contents.filter(it => it instanceof TraitGURPS)
	getTraits(name: string): TargetTrait[]
	//
	hasTrait(name: string): boolean
	// This.hasTrait("Injury Tolerance (Unliving)").
	isUnliving: boolean
	// This.hasTrait("Injury Torance (Homogenous)").
	isHomogenous: boolean
	// This.hasTrait("Injury Tolerance (Diffuse)").
	isDiffuse: boolean
	// Subtract value from HitPoints
	incrementDamage(delta: number): void
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

export { DamageRoll, DamageRollAdapter, DamageAttacker, DefaultHitLocations, DamageWeapon }
