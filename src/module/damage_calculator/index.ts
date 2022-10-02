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
import { double, identity, ModifierFunction, oneAndOneHalf } from "./utils"

const Head = ["skull", "eye", "face"]
const Limb = ["arm", "leg"]
const Extremity = ["hand", "foot"]

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
		const candidateInjury = this.penetratingDamage > 0 ? Math.max(1, temp) : 0
		return this._applyMaximum(candidateInjury)
	}

	private _applyMaximum(candidateInjury: number): number {
		if (Limb.includes(this._damageRoll.locationId)) {
			return Math.min(Math.floor(this._target.hitPoints.value / 2) + 1, candidateInjury)
		}
		if (Extremity.includes(this._damageRoll.locationId)) {
			return Math.min(Math.floor(this._target.hitPoints.value / 3) + 1, candidateInjury)
		}
		return candidateInjury
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

			// TODO In RAW, this doubling only occurs if the target is physiologically male and does not have the
			// "No Vitals" Injury Tolerance trait.
			if (
				this._damageRoll.damageType === DamageType.cr &&
				this._damageRoll.locationId === "groin" &&
				!this._target.hasTrait("No Vitals")
			)
				modifier *= 2

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

		// Fatigue attacks and Injury Tolerance (Homogenous) ignore hit location.
		if (this._damageRoll.damageType === DamageType.fat || this._target.isHomogenous || this._target.isDiffuse) {
			if (this._isMajorWound())
				wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck()]))
		} else {
			switch (this._damageRoll.locationId) {
				case "torso":
					if (this._isMajorWound())
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck()]))
					break

				case "skull":
				case "eye":
					if (this._shockEffects.length > 0 || this._isMajorWound()) {
						let penalty =
							this._damageRoll.damageType !== DamageType.tox && !this._target.hasTrait("No Brain")
								? -10
								: 0
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(penalty)]))
					}
					break

				case "vitals":
					if (this._shockEffects.length > 0) {
						const penalty = this._target.hasTrait("No Vitals") ? 0 : -5
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(penalty)]))
					}
					break

				case "face":
					if (this._isMajorWound())
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(-5)]))
					break

				case "groin":
					if (this._isMajorWound()) {
						const penalty = this._target.hasTrait("No Vitals") ? 0 : -5
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(penalty)]))
					}
					break

				default:
					if (this._isMajorWound())
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck()]))
			}
		}

		return wounds
	}

	private _isMajorWound() {
		let divisor = Extremity.includes(this._damageRoll.locationId) ? 3 : 2
		return this.injury > this._target.hitPoints.value / divisor
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

		if (Limb.includes(this._damageRoll.locationId) && this._isMajorWound()) {
			return [new InjuryEffect(InjuryEffectType.limbCrippled)]
		}

		if (Extremity.includes(this._damageRoll.locationId) && this._isMajorWound()) {
			return [new InjuryEffect(InjuryEffectType.limbCrippled)]
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

		/**
		 * TODO Diffuse: Exception: Area-effect, cone, and explosion attacks cause normal injury.
		 */
		if (this._target.isDiffuse) return multiplier.diffuse
		if (this._target.isHomogenous) return multiplier.homogenous

		// Unliving uses unliving modifiers unless the hit location is skull, eye, or vitals.
		if (this._target.isUnliving && !["skull", "eye", "vitals"].includes(this._damageRoll.locationId))
			return multiplier.unliving

		// No Brain has no extra wounding modifier if hit location is skull or eye.
		if (this._target.hasTrait("No Brain") && ["skull", "eye"].includes(this._damageRoll.locationId))
			return multiplier.theDefault

		// Fatigue damage always ignores hit location.
		if (this._damageRoll.damageType === DamageType.fat) return identity

		// --- Calculate Wounding Modifier for Hit Location. ---

		switch (this._damageRoll.locationId) {
			case "vitals":
				if ([DamageType.imp, ...AnyPiercingType].includes(this._damageRoll.damageType)) return x => x * 3
				return this.isTightBeamBurning() ? double : multiplier.theDefault

			case "skull":
			case "eye":
				return this._damageRoll.damageType !== DamageType.tox ? x => x * 4 : multiplier.theDefault

			case "face":
				return this._damageRoll.damageType === DamageType.cor ? oneAndOneHalf : identity

			case "neck":
				return [DamageType.cor, DamageType.cr].includes(this._damageRoll.damageType)
					? oneAndOneHalf
					: this._damageRoll.damageType === DamageType.cut
					? double
					: multiplier.theDefault

			case "hand":
			case "foot":
			case "arm":
			case "leg":
				return [DamageType.pi_p, DamageType.pi_pp, DamageType.imp].includes(this._damageRoll.damageType)
					? identity
					: multiplier.theDefault

			default:
				return multiplier.theDefault
		}
	}

	private isTightBeamBurning() {
		return this._damageRoll.damageType === DamageType.burn && this._damageRoll.damageModifier === "tbb"
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

export { DamageCalculator, Head, Limb, Extremity }
