import { RollType } from "../data"
import { AnyPiercingType, DamageType, DamageTypes } from "./damage_type"
import {
	CheckFailureConsequence,
	EffectCheck,
	InjuryEffect,
	InjuryEffectType,
	KnockdownCheck,
	_RollModifier,
} from "./injury_effect"
import { double, identity, ModifierFunction, oneAndOneHalf } from "./utils"
import { DamageTarget, DamageRoll, DefaultHitLocations } from "."
import { HitLocationUtil } from "./hitlocation_utils"

const Head = ["skull", "eye", "face"]
const Limb = ["arm", "leg"]
const Extremity = ["hand", "foot"]
const Torso = "torso"

type Descriptor = {
	step: string
	value: string
	notes: string
}

/**
 * Given a DamageRoll and a DamageTarget, the DamageCalculator determines the damage done, if any.
 *
 * This includes special damage effects such as Blunt Trauma, Shock Stun, Knockback, Major Wounds, etc.
 *
 * The DamageCalculator is immutable; you need to create a new one for every damage resolution.
 */
class DamageCalculator {
	target: DamageTarget

	damageRoll: DamageRoll

	private _overrideRawDR: number | undefined

	private _overrideFlexible: boolean | undefined

	private _overrideHardenedDR: number | undefined

	private _overrideVulnerability: number | undefined

	private _overrideBasicDamage: number | undefined

	private _overrideDamageType: DamageType | undefined

	private _overrideArmorDivisor: number | undefined

	private _overrideWoundingModifier: ModifierFunction | undefined

	constructor(damageRoll: DamageRoll, defender: DamageTarget) {
		if (damageRoll.armorDivisor < 0) throw new Error(`Invalid Armor Divisor value: [${damageRoll.armorDivisor}]`)
		this.damageRoll = damageRoll
		this.target = defender
	}

	private get overrides() {
		return [
			this._overrideArmorDivisor,
			this._overrideBasicDamage,
			this._overrideDamageType,
			this._overrideFlexible,
			this._overrideHardenedDR,
			this._overrideRawDR,
			this._overrideVulnerability,
			this._overrideWoundingModifier,
		]
	}

	reset() {
		this.overrides.forEach(it => (it = undefined))
	}

	get isOverridden(): boolean {
		return this.overrides.some(it => it !== undefined)
	}

	get description(): Descriptor[] {
		let results = []
		results.push({ step: "Basic Damage", value: `${this.basicDamage}`, notes: `${this.damageRoll.applyTo}` })
		results.push({ step: "DR", value: `${this.rawDR}`, notes: `${this._hitLocation?.choice_name}` })

		if (this.rawDR !== this.effectiveDR) {
			results.push({
				step: "Effective DR",
				value: `${this.effectiveDR}`,
				notes: `${this.effectiveDRReason}`,
			})
		}

		results.push({
			step: "Penetrating",
			value: `${this.penetratingDamage}`,
			notes: `= ${this.basicDamage} – ${this.effectiveDR}`,
		})
		results.push({
			step: "Modifier",
			value: `×${this.woundingModifier.name}`,
			notes: `${this.woundingModifierReason}`,
		})
		results.push({
			step: "Injury",
			value: `${this.injury}`,
			notes: this._isBluntTrauma ? "Blunt Trauma" : `= ${this.penetratingDamage} × ${this.woundingModifier.name}`,
		})

		return results
	}

	get basicDamage(): number {
		return this._overrideBasicDamage ?? this.damageRoll.basicDamage
	}

	get overrideBasicDamage(): number | undefined {
		return this._overrideBasicDamage
	}

	set overrideBasicDamage(value: number | undefined) {
		this._overrideBasicDamage = this.damageRoll.basicDamage === value ? undefined : value
	}

	/**
	 * @returns {number} - The basic damage; typically directly from the damage roll.
	 */
	get adjustedBasicDamage(): number {
		if (this._isExplosion && this.damageRoll.range) {
			if (this.damageRoll.range > this._diceOfDamage * 2) return 0
			return Math.floor(this.basicDamage / (3 * this.damageRoll.range))
		}

		let halfD = this.damageRoll.isHalfDamage ? 0.5 : 1
		return this._isKnockbackOnly
			? 0
			: Math.floor(this.basicDamage * halfD) * this._multiplierForShotgunExtremelyClose
	}

	get damageType(): DamageType {
		return this._overrideDamageType ?? this.damageRoll.damageType
	}

	get damageTypeKey(): string {
		return this.damageType.key
	}

	set overrideDamageType(key: string | undefined) {
		if (key === undefined) this._overrideDamageType = undefined
		else {
			const value = getProperty(DamageTypes, key) as DamageType
			this._overrideDamageType = this.damageRoll.damageType === value ? undefined : value
		}
	}

	get overrideDamageType(): string | undefined {
		return this._overrideDamageType?.key
	}

	private get _isKnockbackOnly() {
		return this.damageType === DamageTypes.kb
	}

	private get _isExplosion(): boolean {
		return this.damageRoll.damageModifier === "ex"
	}

	private get _diceOfDamage(): number {
		return this.damageRoll.dice.count
	}

	/**
	 * @returns {number} - The amount of damage that penetrates any DR.
	 */
	get penetratingDamage(): number {
		return Math.max(this.adjustedBasicDamage - this.effectiveDR, 0)
	}

	/**
	 * @returns {number} - The final amount of damage inflicted on the defender (does not consider blunt trauma).
	 */
	get injury(): number {
		return this._isBluntTrauma ? this.bluntTrauma : this._adjustedInjury
	}

	get _adjustedInjury(): number {
		let candidateInjury = this.candidateInjury / this._damageReductionValue
		return this._applyMaximum(candidateInjury)
	}

	get _isBluntTrauma(): boolean {
		return this._adjustedInjury === 0 && this.bluntTrauma > 0
	}

	get candidateInjury(): number {
		let temp = Math.floor(this.woundingModifier.function(this.penetratingDamage))
		temp = temp * this.vulnerabilityLevel
		return this.penetratingDamage > 0 ? Math.max(1, temp) : 0
	}

	get woundingModifier(): ModifierFunction {
		return this._overrideWoundingModifier ?? this._woundingModifier
	}

	set overrideWoundingModifier(value: number | undefined) {
		this._overrideWoundingModifier = value
			? {
					name: `${value}`,
					function: x => x * value,
			  }
			: undefined
	}

	get woundingModifierReason(): string {
		if (this._overrideWoundingModifier) return "Overriden"
		return this.damageType.label
	}

	/**
	 * @param candidateInjury
	 * @returns {number} injury maximum value based on hit location.
	 */
	private _applyMaximum(candidateInjury: number): number {
		if (Limb.includes(this.damageRoll.locationId)) {
			return Math.min(Math.floor(this.target.hitPoints.value / 2) + 1, candidateInjury)
		}

		if (Extremity.includes(this.damageRoll.locationId)) {
			return Math.min(Math.floor(this.target.hitPoints.value / 3) + 1, candidateInjury)
		}

		return candidateInjury
	}

	get _hitLocation() {
		return HitLocationUtil.getHitLocation(this.target.hitLocationTable, this.damageRoll.locationId)
	}

	private get _damageReductionValue() {
		let trait = this.target.getTrait("Damage Reduction")
		return trait ? trait.levels : 1
	}

	/**
	 * @returns {number} - The amount of blunt trauma damage, if any.
	 */
	get bluntTrauma(): number {
		if (this.damageType === DamageTypes.fat) return 0

		if (this.penetratingDamage > 0 || !this.isFlexibleArmor) return 0
		return this._bluntTraumaDivisor > 0 ? Math.floor(this.adjustedBasicDamage / this._bluntTraumaDivisor) : 0
	}

	get isFlexibleArmor(): boolean {
		return (
			this._overrideFlexible ??
			HitLocationUtil.isFlexibleArmor(
				HitLocationUtil.getHitLocation(this.target.hitLocationTable, this.damageRoll.locationId)
			)
		)
	}

	overrideFlexible(value: boolean | undefined): void {
		this._overrideFlexible = value
	}

	/**
	 * Return yards of knockback, if any.
	 */
	get knockback() {
		if (this._isDamageTypeKnockbackEligible()) {
			if (this.damageType === DamageTypes.cut && this.penetratingDamage > 0) return 0

			return Math.floor(this.basicDamage / (this._knockbackResistance - 2))
		}
		return 0
	}

	private _isDamageTypeKnockbackEligible() {
		return [DamageTypes.cr, DamageTypes.cut, DamageTypes.kb].includes(this.damageType)
	}

	private get _knockbackResistance() {
		return this.target.ST
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
				this.damageType === DamageTypes.cr &&
				this.damageRoll.locationId === "groin" &&
				!this.target.hasTrait("No Vitals")
			)
				modifier *= 2

			const shockEffect = new InjuryEffect(InjuryEffectType.shock, [
				new _RollModifier("dx", RollType.Attribute, modifier),
				new _RollModifier("iq", RollType.Attribute, modifier),
			])
			return [shockEffect]
		}
		return []
	}

	private get _shockFactor(): number {
		return Math.floor(this.target.hitPoints.value / 10)
	}

	private get _majorWoundEffects(): InjuryEffect[] {
		const wounds = []

		// Fatigue attacks and Injury Tolerance (Homogenous) ignore hit location.
		if (this.damageType === DamageTypes.fat || this.target.isHomogenous || this.target.isDiffuse) {
			if (this._isMajorWound())
				wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck()]))
		} else {
			switch (this.damageRoll.locationId) {
				case "torso":
					if (this._isMajorWound())
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck()]))
					break

				case "skull":
				case "eye":
					if (this._shockEffects.length > 0 || this._isMajorWound()) {
						let penalty = this.damageType !== DamageTypes.tox && !this.target.hasTrait("No Brain") ? -10 : 0
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(penalty)]))
					}
					break

				case "vitals":
					if (this._shockEffects.length > 0) {
						const penalty = this.target.hasTrait("No Vitals") ? 0 : -5
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(penalty)]))
					}
					break

				case "face":
					if (this._isMajorWound())
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(-5)]))
					break

				case "groin":
					if (this._isMajorWound()) {
						const penalty = this.target.hasTrait("No Vitals") ? 0 : -5
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
		let divisor = Extremity.includes(this.damageRoll.locationId) ? 3 : 2
		return this.injury > this.target.hitPoints.value / divisor
	}

	private get _knockbackEffects(): InjuryEffect[] {
		// Cache the result of `this.knockback` as we will use it multiple times.
		let knockback = this.knockback

		if (knockback === 0) return []

		let penalty = knockback === 1 ? 0 : -1 * (knockback - 1)

		if (this.target.hasTrait("Perfect Balance")) penalty += 4

		const knockbackEffect = new InjuryEffect(
			InjuryEffectType.knockback,
			[],
			[
				new EffectCheck(
					[
						new _RollModifier("dx", RollType.Attribute, penalty),
						new _RollModifier("Acrobatics", RollType.Skill, penalty),
						new _RollModifier("Judo", RollType.Skill, penalty),
					],
					[new CheckFailureConsequence("fall prone", 0)]
				),
			]
		)
		return [knockbackEffect]
	}

	private get _miscellaneousEffects(): InjuryEffect[] {
		if (this.damageRoll.locationId === "eye" && this.injury > this.target.hitPoints.value / 10)
			return [new InjuryEffect(InjuryEffectType.eyeBlinded)]

		if (this.damageRoll.locationId === "face" && this._isMajorWound()) {
			return this.injury > this.target.hitPoints.value
				? [new InjuryEffect(InjuryEffectType.blinded)]
				: [new InjuryEffect(InjuryEffectType.eyeBlinded)]
		}

		if (Limb.includes(this.damageRoll.locationId) && this._isMajorWound()) {
			return [new InjuryEffect(InjuryEffectType.limbCrippled)]
		}

		if (Extremity.includes(this.damageRoll.locationId) && this._isMajorWound()) {
			return [new InjuryEffect(InjuryEffectType.limbCrippled)]
		}

		return []
	}

	private get _bluntTraumaDivisor() {
		if (!this.isFlexibleArmor) return 1
		if (this.damageType === DamageTypes.cr) return 5
		return [
			DamageTypes.cut,
			DamageTypes.imp,
			DamageTypes.pi,
			DamageTypes["pi-"],
			DamageTypes["pi+"],
			DamageTypes["pi++"],
		].includes(this.damageType)
			? 10
			: 1
	}

	get effectiveDR() {
		if (this._isIgnoreDR || this.isInternalExplosion) return 0

		let dr = this.damageType === DamageTypes.injury ? 0 : Math.floor(this._basicDR / this.effectiveArmorDivisor)

		// If the AD is a fraction, minimum DR is 1.
		return this.effectiveArmorDivisor < 1 ? Math.max(dr, 1) : dr
	}

	private get effectiveDRReason(): string | undefined {
		// TODO localize reason here, or return language key only
		if (this.isInternalExplosion) return "Internal Explosion"
		if (this.damageType === DamageTypes.injury || this.effectiveArmorDivisor === 0) return "Ignores DR"
		if (this.effectiveArmorDivisor !== 1) return `Armor Divisor (${this.armorDivisor})`
		return undefined
	}

	private get _isIgnoreDR(): boolean {
		return this.effectiveArmorDivisor === 0
	}

	get isInternalExplosion(): boolean {
		return this._isExplosion && this.damageRoll.internalExplosion
	}

	private get _basicDR() {
		if (this._overrideRawDR) return this._overrideRawDR

		let basicDr = 0
		if (this._isLargeAreaInjury) {
			let torso = HitLocationUtil.getHitLocation(this.target.hitLocationTable, Torso)

			let allDR: number[] = this.target.hitLocationTable.locations
				.map(it => HitLocationUtil.getHitLocationDR(it, this.damageType))
				.filter(it => it !== -1)

			basicDr = (HitLocationUtil.getHitLocationDR(torso, this.damageType) + Math.min(...allDR)) / 2
		} else {
			basicDr = this.rawDR
		}

		return basicDr * this._multiplierForShotgunExtremelyClose
	}

	get rawDR(): number {
		const location = this.target.hitLocationTable.locations.find(it => it.id === this.damageRoll.locationId)
		return this._overrideRawDR ?? HitLocationUtil.getHitLocationDR(location, this.damageType)
	}

	set overrideRawDr(dr: number | undefined) {
		const location = this.target.hitLocationTable.locations.find(it => it.id === this.damageRoll.locationId)
		this._overrideRawDR = HitLocationUtil.getHitLocationDR(location, this.damageType) === dr ? undefined : dr
	}

	get overrideRawDR() {
		return this._overrideRawDR
	}

	private get _isLargeAreaInjury() {
		return this.damageRoll.locationId === DefaultHitLocations.LargeArea
	}

	private get _multiplierForShotgunExtremelyClose() {
		return this.damageRoll.isShotgunCloseRange ? Math.floor(this.damageRoll.rofMultiplier / 2) : 1
	}

	/**
	 * Encapsulate here to allow overriding.
	 */
	get armorDivisor() {
		return this._overrideArmorDivisor ?? this.damageRoll.armorDivisor
	}

	get overrideArmorDivisor(): number | undefined {
		return this._overrideArmorDivisor
	}

	set overrideArmorDivisor(value: number | undefined) {
		this._overrideArmorDivisor = this.damageRoll.armorDivisor === value ? undefined : value
	}

	get effectiveArmorDivisor() {
		let ad = this.armorDivisor
		if (ad > 0 && ad < 1) return ad

		// If this is an explosion, and the target is collateral damage, ignore Armor Divisors.
		// My assumption is that this is true regardless of whether the AD is > 1 or < 1.
		if (this._isCollateralDamage) {
			return 1
		}

		const armorDivisors = [0, 100, 10, 5, 3, 2, 1]
		let index = armorDivisors.indexOf(ad)

		// Let damageResistance = this.target.getTrait("Damage Resistance")
		// if (damageResistance) {
		// 	let level = damageResistance.getModifier("Hardened")?.levels ?? 0
		// 	index += level
		index += this.hardenedDRLevel
		if (index > armorDivisors.length - 1) index = armorDivisors.length - 1
		// }

		return armorDivisors[index]
	}

	overrideHardenedDR(level: number | undefined) {
		this._overrideHardenedDR = level
	}

	get hardenedDRLevel(): number {
		return (
			this._overrideHardenedDR ?? this.target.getTrait("Damage Resistance")?.getModifier("Hardened")?.levels ?? 0
		)
	}

	get vulnerabilityLevel(): number {
		return this._overrideVulnerability ?? this.target.vulnerabilityLevel ?? 1
	}

	private get _isCollateralDamage(): boolean {
		return this._isExplosion && this._isAtRange
	}

	private get _isAtRange(): boolean {
		return this.damageRoll.range != null && this.damageRoll.range > 0
	}

	private get _woundingModifier(): ModifierFunction {
		/**
		 * TODO Diffuse: Exception: Area-effect, cone, and explosion attacks cause normal injury.
		 */
		if (this.target.isDiffuse) return this.damageType.diffuse
		if (this.target.isHomogenous) return this.damageType.homogenous

		// Unliving uses unliving modifiers unless the hit location is skull, eye, or vitals.
		if (this.target.isUnliving && !["skull", "eye", "vitals"].includes(this.damageRoll.locationId))
			return this.damageType.unliving

		// No Brain has no extra wounding modifier if hit location is skull or eye.
		if (this.target.hasTrait("No Brain") && ["skull", "eye"].includes(this.damageRoll.locationId))
			return this.damageType.theDefault

		// Fatigue damage always ignores hit location.
		if (this.damageType === DamageTypes.fat) return identity

		// --- Calculate Wounding Modifier for Hit Location. ---

		switch (this.damageRoll.locationId) {
			case "vitals":
				if ([DamageTypes.imp, ...AnyPiercingType].includes(this.damageType))
					return { name: "3", function: x => x * 3 }
				return this.isTightBeamBurning() ? double : this.damageType.theDefault

			case "skull":
			case "eye":
				return this.damageType !== DamageTypes.tox
					? { name: "4", function: x => x * 4 }
					: this.damageType.theDefault

			case "face":
				return this.damageType === DamageTypes.cor ? oneAndOneHalf : identity

			case "neck":
				return [DamageTypes.cor, DamageTypes.cr].includes(this.damageType)
					? oneAndOneHalf
					: this.damageType === DamageTypes.cut
					? double
					: this.damageType.theDefault

			case "hand":
			case "foot":
			case "arm":
			case "leg":
				return [DamageTypes["pi+"], DamageTypes["pi++"], DamageTypes.imp].includes(this.damageType)
					? identity
					: this.damageType.theDefault

			default:
				return this.damageType.theDefault
		}
	}

	private isTightBeamBurning() {
		return this.damageType === DamageTypes.burn && this.damageRoll.damageModifier === "tbb"
	}

	// Private get _defenderHitLocations(): Array<HitLocation> {
	// 	return this.target.hitLocationTable.locations
	// }
}

export { DamageCalculator, Head, Limb, Extremity, Descriptor }
