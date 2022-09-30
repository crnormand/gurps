import { RollType } from "../data"
import { DamageRoll } from "./damage_roll"
import { DamageTarget } from "./damage_target"
import { AnyPiercingType, DamageType, dataTypeMultiplier } from "./damage_type"
import { HitLocation } from "./hit_location"
import {
	CheckFailureConsequence,
	EffectCheck,
	InjuryEffect,
	InjuryEffectType,
	KnockdownCheck,
	RollModifier,
} from "./injury_effect"
import { identity, ModifierFunction } from "./utils"

const Head = ["skull", "eye", "face"]

/**
 * Given a DamageRoll and a DamageTarget, the DamageCalculator determines the damage done, if any.
 *
 * This includes special damage effects such as Blunt Trauma, Shock Stun, Knockback, Major Wounds, etc.
 *
 * The DamageCalculator is immutable; you need to create a new one for every damage resolution.
 */
class DamageCalculator {
	private _target: DamageTarget

	private _damageRoll: DamageRoll

	constructor(damageRoll: DamageRoll, defender: DamageTarget) {
		if (damageRoll.armorDivisor < 0) throw new Error(`Invalid Armor Divisor value: [${damageRoll.armorDivisor}]`)
		this._damageRoll = damageRoll
		this._target = defender
	}

	/**
	 * @returns {number} - The basic damage; typically directly from the damage roll.
	 */
	get basicDamage(): number {
		return this._isKnockbackOnly() ? 0 : this._basicDamage
	}

	private _isKnockbackOnly() {
		return this._damageRoll.damageType === DamageType.kb
	}

	private get _basicDamage(): number {
		return this._damageRoll.basicDamage
	}

	/**
	 * @returns {number} - The amount of damage that penetrates any DR.
	 */
	get penetratingDamage(): number {
		return Math.max(this.basicDamage - this._effectiveDR, 0)
	}

	/**
	 * @returns {number} - The final amount of damage inflicted on the defender (does not consider blunt trauma).
	 */
	get injury(): number {
		const temp = Math.floor(this._woundingModifier(this.penetratingDamage))
		return this.penetratingDamage > 0 ? Math.max(1, temp) : 0
	}

	/**
	 * @returns {number} - The amount of blunt trauma damage, if any.
	 */
	get bluntTrauma(): number {
		if (this._damageRoll.damageType === DamageType.fat) return 0

		if (this.penetratingDamage > 0 || !this._isFlexibleArmor()) return 0
		return this._bluntTraumaDivisor > 0 ? Math.floor(this.basicDamage / this._bluntTraumaDivisor) : 0
	}

	private _isFlexibleArmor() {
		return this._targetedHitLocation?.calc.flexible
	}

	/**
	 * Return yards of knockback, if any.
	 */
	get knockback() {
		if (this._isDamageTypeKnockbackEligible()) {
			if (this._damageRoll.damageType === DamageType.cut && this.penetratingDamage > 0) return 0

			return Math.floor(this._basicDamage / (this._knockbackResistance - 2))
		}
		return 0
	}

	private _isDamageTypeKnockbackEligible() {
		return [DamageType.cr, DamageType.cut, DamageType.kb].includes(this._damageRoll.damageType)
	}

	private get _knockbackResistance() {
		return this._target.ST
	}

	/**
	 * @returns {Array<InjuryEffect>} - The list of injury effects caused by this damage.
	 */
	get injuryEffects(): Array<InjuryEffect> {
		let effects: InjuryEffect[] = []

		effects.push(...this._shockEffects)
		effects.push(...this._majorWoundEffects)
		effects.push(...this._knockbackEffects)
		effects.push(...this._miscellaneousEffects)

		return effects
	}

	private get _shockEffects(): InjuryEffect[] {
		let rawModifier = Math.floor(this.injury / this._shockFactor)
		if (rawModifier > 0) {
			let modifier = Math.min(4, rawModifier) * -1
			const shockEffect = new InjuryEffect(InjuryEffectType.shock, [
				new RollModifier("dx", RollType.Attribute, modifier),
				new RollModifier("iq", RollType.Attribute, modifier),
			])
			return [shockEffect]
		}
		return []
	}

	private get _shockFactor(): number {
		return Math.floor(this._target.hitPoints.value / 10)
	}

	private get _majorWoundEffects(): InjuryEffect[] {
		const wounds = []

		// Fatigue attacks ignore hit location
		if (this._damageRoll.damageType === DamageType.fat && this._isMajorWound()) {
			wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck()]))
		} else if (this._damageRoll.locationId === "torso" && this._isMajorWound()) {
			wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck()]))
		} else if (
			["skull", "eye"].includes(this._damageRoll.locationId) &&
			(this._shockEffects.length > 0 || this._isMajorWound()) &&
			this._damageRoll.damageType !== DamageType.tox
		) {
			wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(-10)]))
		} else if (this._damageRoll.locationId === "vitals" && this._shockEffects.length > 0) {
			wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(-5)]))
		} else if (this._damageRoll.locationId === "face" && this._isMajorWound()) {
			wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(-5)]))
		} else if (this._isMajorWound()) {
			wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck()]))
		}
		return wounds
	}

	private _isMajorWound() {
		return this.injury > this._target.hitPoints.value / 2
	}

	private get _knockbackEffects(): InjuryEffect[] {
		// Cache the result of `this.knockback` as we will use it multiple times.
		let knockback = this.knockback

		if (knockback === 0) return []

		let penalty = knockback === 1 ? 0 : -1 * (knockback - 1)

		if (this._target.hasTrait("Perfect Balance")) penalty += 4

		const knockbackEffect = new InjuryEffect(
			InjuryEffectType.knockback,
			[],
			[
				new EffectCheck(
					[
						new RollModifier("dx", RollType.Attribute, penalty),
						new RollModifier("Acrobatics", RollType.Skill, penalty),
						new RollModifier("Judo", RollType.Skill, penalty),
					],
					[new CheckFailureConsequence("fall prone", 0)]
				),
			]
		)
		return [knockbackEffect]
	}

	private get _miscellaneousEffects(): InjuryEffect[] {
		if (this._damageRoll.locationId === "eye" && this.injury > this._target.hitPoints.value / 10)
			return [new InjuryEffect(InjuryEffectType.eyeBlinded)]

		if (this._damageRoll.locationId === "face" && this._isMajorWound()) {
			return this.injury > this._target.hitPoints.value
				? [new InjuryEffect(InjuryEffectType.blinded)]
				: [new InjuryEffect(InjuryEffectType.eyeBlinded)]
		}

		return []
	}

	private get _bluntTraumaDivisor() {
		if (this._damageRoll.damageType === DamageType.cr) return 5
		return [
			DamageType.cut,
			DamageType.imp,
			DamageType.pi,
			DamageType.pi_m,
			DamageType.pi_p,
			DamageType.pi_pp,
		].includes(this._damageRoll.damageType)
			? 10
			: 0
	}

	private get _effectiveDR() {
		if (this._isIgnoreDR()) return 0

		let dr =
			this._damageRoll.damageType === DamageType.injury
				? 0
				: Math.floor(this._basicDR / this._effectiveArmorDivisor)

		// If the AD is a fraction, minimum DR is 1.
		return this._effectiveArmorDivisor < 1 ? Math.max(dr, 1) : dr
	}

	private _isIgnoreDR(): boolean {
		return this._effectiveArmorDivisor === 0
	}

	/**
	 * Encapsulate here to allow overriding.
	 */
	private get _effectiveArmorDivisor() {
		return this._damageRoll.armorDivisor
	}

	private get _basicDR() {
		return this._targetedHitLocation?.calc.dr?.all ?? 0
	}

	private get _woundingModifier(): ModifierFunction {
		const multiplier = dataTypeMultiplier[this._damageRoll.damageType]
		if (this._target.isUnliving) return multiplier.unliving
		if (this._target.isHomogenous) return multiplier.homogenous

		/**
		 * TODO Diffuse: Exception: Area-effect, cone, and explosion attacks cause normal injury.
		 */
		if (this._target.isDiffuse) return multiplier.diffuse

		// --- Calculate Wounding Modifier for Hit Location. ---

		// Fatigue damage always ignores hit location.
		if (this._damageRoll.damageType === DamageType.fat) return identity

		if (this._damageRoll.locationId === "vitals") {
			if ([DamageType.imp, ...AnyPiercingType].includes(this._damageRoll.damageType)) return x => x * 3
			if (this._damageRoll.damageType === DamageType.burn && this._damageRoll.damageModifier === "tbb")
				return x => x * 2
		}
		if (["skull", "eye"].includes(this._damageRoll.locationId)) {
			if (this._damageRoll.damageType !== DamageType.tox) return x => x * 4
		}
		if (this._damageRoll.locationId === "face") {
			return this._damageRoll.damageType === DamageType.cor ? x => x * 1.5 : identity
		}
		return multiplier.theDefault
	}

	private get _defenderHitLocations(): Array<HitLocation> {
		return this._target.hitLocationTable.locations
	}

	private get _targetedHitLocationId(): string {
		return this._damageRoll.locationId
	}

	private get _targetedHitLocation(): HitLocation | undefined {
		return this._defenderHitLocations.find(it => it.id === this._targetedHitLocationId)
	}
}

export { DamageCalculator }
