import { RollType } from "../data"
import { AnyPiercingType, DamageType, DamageTypes } from "./damage_type"
import {
	CheckFailureConsequence,
	EffectCheck,
	InjuryEffect,
	InjuryEffectType,
	KnockdownCheck,
	RollModifier,
} from "./injury_effect"
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

type Overrides = {
	rawDR: number | undefined
	flexible: boolean | undefined
	hardenedDR: number | undefined
	vulnerability: number | undefined
	basicDamage: number | undefined
	damageType: DamageType | undefined
	armorDivisor: number | undefined
	woundingModifier: number | undefined
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

	private _overrides: Overrides = {
		rawDR: undefined,
		flexible: undefined,
		hardenedDR: undefined,
		vulnerability: undefined,
		basicDamage: undefined,
		damageType: undefined,
		armorDivisor: undefined,
		woundingModifier: undefined,
	}

	constructor(damageRoll: DamageRoll, defender: DamageTarget) {
		if (damageRoll.armorDivisor < 0) throw new Error(`Invalid Armor Divisor value: [${damageRoll.armorDivisor}]`)
		this.damageRoll = damageRoll
		this.target = defender
	}

	resetOverrides() {
		let key: keyof Overrides
		for (key in this._overrides) {
			this._overrides[key] = undefined
		}
	}

	get isOverridden(): boolean {
		return Object.values(this._overrides).some(it => it !== undefined)
	}

	/**
	 * @returns {number} the final amount of adjusted injury OR any Blunt Trauma (if adjusted injury is 0).
	 */
	get injury(): number {
		return this._injuryValueAndReason[0]
	}

	get _injuryValueAndReason(): [number, string] {
		if (this._isBluntTrauma) return [this.bluntTrauma, "Blunt Trauma"]
		const injury = this._adjustedInjury
		return [injury[0], injury[1]]
	}

	/**
	 * @returns {boolean} true if the attack causes blunt trauma.
	 */
	private get _isBluntTrauma(): boolean {
		return this._adjustedInjury[0] === 0 && this.bluntTrauma > 0
	}

	/**
	 * @returns {number} injury adjusted by any Damage Reduction, hit location, or Injury Tolerance.
	 */
	private get _adjustedInjury(): [number, string] {
		let candidateInjuryReason = `${this.penetratingDamage} × ${this.formatFraction(this.woundingModifier)}`
		let reason = `= ${candidateInjuryReason}`

		const adjustedForDamageReduction = this.candidateInjury / this._damageReductionValue
		// If (this._damageReductionValue !== 1)
		// 	reason = `= (${candidateInjuryReason}) ÷ ${this._damageReductionValue} Damage Reduction`

		const maxHitLocation = this._maximumForHitLocation
		const adjustedForHitLocationMax = Math.min(adjustedForDamageReduction, maxHitLocation[0])
		if (maxHitLocation[0] !== Infinity) reason = `= ${candidateInjuryReason}, ${maxHitLocation[1]}`

		const maxInjuryTolerance = this._maximumForInjuryTolerance
		const adjustedForInjuryTolerance = Math.min(adjustedForHitLocationMax, maxInjuryTolerance[0])
		if (maxInjuryTolerance[0] !== Infinity) reason = `= ${candidateInjuryReason}, ${maxInjuryTolerance[1]}`

		return [adjustedForInjuryTolerance, reason]
	}

	/**
	 * @returns the maximum injury based on hit location, or Infinity if none.
	 */
	private get _maximumForHitLocation(): [number, string] {
		if (Limb.includes(this.damageRoll.locationId)) {
			const max = Math.floor(this.target.hitPoints.value / 2) + 1
			return [max, `Maximum ${max} for ${this.damageRoll.locationId}`]
		}

		if (Extremity.includes(this.damageRoll.locationId)) {
			const max = Math.floor(this.target.hitPoints.value / 3) + 1
			return [max, `Maximum ${max} for ${this.damageRoll.locationId}`]
		}

		return [Infinity, ""]
	}

	/**
	 * @returns {number} the maximum injury based on Injury Tolerance, or Infinity.
	 */
	private get _maximumForInjuryTolerance(): [number, string] {
		if (this.target.isDiffuse) {
			if ([DamageTypes.imp, ...AnyPiercingType].includes(this.damageType)) return [1, "Maximum 1 (Diffuse)"]
			return [2, "Maximum 2 (Diffuse)"]
		}
		return [Infinity, ""]
	}

	/**
	 * @returns {number} the amount of blunt trauma damage, if any.
	 */
	private get bluntTrauma(): number {
		if (this.damageType === DamageTypes.fat) return 0

		if (this.penetratingDamage > 0 || !this.isFlexibleArmor) return 0
		return this._bluntTraumaDivisor > 0 ? Math.floor(this.adjustedBasicDamage / this._bluntTraumaDivisor) : 0
	}

	/**
	 * @returns {number} the divisor used to determine amount of blunt trauma; this is a fraction
	 * of the total damage done.
	 */
	private get _bluntTraumaDivisor(): number {
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

	/**
	 * @returns {number} injury adjusted by wounding modifier AND any other multipliers (such as Vulnerability).
	 */
	private get candidateInjury(): number {
		let temp = Math.floor(this.woundingModifier * this.penetratingDamage)
		temp = temp * this.vulnerabilityLevel
		return this.penetratingDamage > 0 ? Math.max(1, temp) : 0
	}

	get woundingModifier(): number {
		return this._overrides.woundingModifier ?? this._woundingModifier
	}

	set overrideWoundingModifier(value: number | undefined) {
		this._overrides.woundingModifier = value === this._woundingModifier ? undefined : value
	}

	private get _woundingModifier(): number {
		if (this._woundingModifierByInjuryTolerance) return this._woundingModifierByInjuryTolerance[0]

		// Fatigue damage always ignores hit location.
		if (this._woundingModifierByDamageType) return this._woundingModifierByDamageType[0]

		// Calculate Wounding Modifier for Hit Location
		return this._woundingModifierByHitLocation[0]
	}

	private get _woundingModifierByDamageType(): [number, string] | undefined {
		// Fatigue damage always ignores hit location.
		if (this.damageType === DamageTypes.fat) return [1, "Fatigue ignores Hit Location"]
		return undefined
	}

	private get _woundingModifierByInjuryTolerance(): [number, string] | undefined {
		/**
		 * TODO Diffuse: Exception: Area-effect, cone, and explosion attacks cause normal injury.
		 */
		if (this.target.isHomogenous) return [this.damageType.homogenous, "Homogenous"]

		// Unliving uses unliving modifiers unless the hit location is skull, eye, or vitals.
		if (this.target.isUnliving && !["skull", "eye", "vitals"].includes(this.damageRoll.locationId))
			return [this.damageType.unliving, "Unliving"]

		// No Brain has no extra wounding modifier if hit location is skull or eye.
		if (this.target.hasTrait("No Brain") && ["skull", "eye"].includes(this.damageRoll.locationId))
			return [this.damageType.theDefault, "No Brain"]

		return undefined
	}

	/**
	 * @returns {number} wounding modifier only based on hit location.
	 */
	private get _woundingModifierByHitLocation(): [number, string] {
		const standardMessage = `${this.damageType.key}, ${this.damageRoll.locationId}`

		switch (this.damageRoll.locationId) {
			case "vitals":
				if ([DamageTypes.imp, ...AnyPiercingType].includes(this.damageType)) return [3, standardMessage]
				if (this.isTightBeamBurning()) return [2, `Tight beam burning, ${this.damageRoll.locationId}`]
				break

			case "skull":
			case "eye":
				if (this.damageType !== DamageTypes.tox) return [4, standardMessage]
				break

			case "face":
				if (this.damageType === DamageTypes.cor) return [1.5, standardMessage]
				break

			case "neck":
				if ([DamageTypes.cor, DamageTypes.cr].includes(this.damageType)) return [1.5, standardMessage]
				if (this.damageType === DamageTypes.cut) return [2, standardMessage]
				break

			case "hand":
			case "foot":
			case "arm":
			case "leg":
				if ([DamageTypes["pi+"], DamageTypes["pi++"], DamageTypes.imp].includes(this.damageType))
					return [1, standardMessage]
				break
		}
		return [this.damageType.theDefault, standardMessage]
	}

	/**
	 * @returns {number} - The amount of damage that penetrates any DR.
	 */
	get penetratingDamage(): number {
		return Math.max(this.adjustedBasicDamage - this.effectiveDR, 0)
	}

	/**
	 * @returns {number} the basic damage adjusted for explosions, 1/2D ranged attacks, and shotgun-like damage
	 * at extremely close range.
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

	private get _multiplierForShotgunExtremelyClose() {
		return this.damageRoll.isShotgunCloseRange ? Math.floor(this.damageRoll.rofMultiplier / 2) : 1
	}

	private get effectiveDR() {
		if (this._isIgnoreDR || this.isInternalExplosion) return 0

		let dr = this.damageType === DamageTypes.injury ? 0 : Math.floor(this._basicDR / this.effectiveArmorDivisor)

		// If the AD is a fraction, minimum DR is 1.
		return this.effectiveArmorDivisor < 1 ? Math.max(dr, 1) : dr
	}

	private get _isIgnoreDR(): boolean {
		return this.effectiveArmorDivisor === 0
	}

	private get _basicDR() {
		if (this._overrides.rawDR) return this._overrides.rawDR

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

	private get effectiveArmorDivisor() {
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

	// -- Describe the Damage Calculation ---

	get description(): Descriptor[] {
		let results = []
		results.push({ step: "Basic Damage", value: `${this.basicDamage}`, notes: `${this.damageRoll.applyTo}` })
		results.push({ step: "Damage Resistance", value: `${this.rawDR}`, notes: `${this._hitLocation?.choice_name}` })

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
			step: "Wounding Modifier",
			value: `×${this.formatFraction(this._woundingModifierByHitLocation[0])}`,
			notes: `${this._woundingModifierByHitLocation[1]}`,
		})

		if (this.woundingModifier !== this._woundingModifierByHitLocation[0]) {
			results.push({
				step: "Effective Modifier",
				value: `×${this.formatFraction(this.woundingModifier)}`,
				notes: `${this.woundingModifierReason}`,
			})
		}

		results.push({
			step: "Injury",
			value: `${this.injury}`,
			notes: this._injuryValueAndReason[1],
		})

		return results
	}

	formatFraction(value: number) {
		if (value === 0.5) return "1/2"
		if (value === 1 / 3) return "1/3"
		if (value === 0.2) return "1/5"
		if (value === 0.1) return "1/10"
		return `${value}`
	}

	get woundingModifierReason(): string {
		if (this._overrides.woundingModifier) return "Overriden"

		if (this._woundingModifierByInjuryTolerance) return this._woundingModifierByInjuryTolerance[1]

		if (this._woundingModifierByDamageType) return this._woundingModifierByDamageType[1]

		return this._woundingModifierByHitLocation[1]
	}

	private get effectiveDRReason(): string | undefined {
		// TODO localize reason here, or return language key only
		if (this.isInternalExplosion) return "Internal Explosion"
		if (this.damageType === DamageTypes.injury || this.effectiveArmorDivisor === 0) return "Ignores DR"
		if (this.effectiveArmorDivisor !== 1) return `Armor Divisor (${this.armorDivisor})`
		return undefined
	}

	// --- Effects caused by Injury ---

	/**
	 * @returns {number} yards of knockback, if any.
	 */
	get knockback(): number {
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
				new RollModifier("dx", RollType.Attribute, modifier),
				new RollModifier("iq", RollType.Attribute, modifier),
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

	// --- Basic Damage ---

	get basicDamage(): number {
		return this._overrides.basicDamage ?? this.damageRoll.basicDamage
	}

	get overrideBasicDamage(): number | undefined {
		return this._overrides.basicDamage
	}

	set overrideBasicDamage(value: number | undefined) {
		this._overrides.basicDamage = this.damageRoll.basicDamage === value ? undefined : value
	}

	// --- Damage Type ---

	get damageType(): DamageType {
		return this._overrides.damageType ?? this.damageRoll.damageType
	}

	get damageTypeKey(): string {
		return this.damageType.key
	}

	set overrideDamageType(key: string | undefined) {
		if (key === undefined) this._overrides.damageType = undefined
		else {
			const value = getProperty(DamageTypes, key) as DamageType
			this._overrides.damageType = this.damageRoll.damageType === value ? undefined : value
		}
	}

	get overrideDamageType(): string | undefined {
		return this._overrides.damageType?.key
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

	get _hitLocation() {
		return HitLocationUtil.getHitLocation(this.target.hitLocationTable, this.damageRoll.locationId)
	}

	private get _damageReductionValue() {
		let trait = this.target.getTrait("Damage Reduction")
		return trait ? trait.levels : 1
	}

	get isFlexibleArmor(): boolean {
		return (
			this._overrides.flexible ??
			HitLocationUtil.isFlexibleArmor(
				HitLocationUtil.getHitLocation(this.target.hitLocationTable, this.damageRoll.locationId)
			)
		)
	}

	overrideFlexible(value: boolean | undefined): void {
		this._overrides.flexible = value
	}

	get isInternalExplosion(): boolean {
		return this._isExplosion && this.damageRoll.internalExplosion
	}

	get rawDR(): number {
		const location = this.target.hitLocationTable.locations.find(it => it.id === this.damageRoll.locationId)
		return this._overrides.rawDR ?? HitLocationUtil.getHitLocationDR(location, this.damageType)
	}

	set overrideRawDr(dr: number | undefined) {
		const location = this.target.hitLocationTable.locations.find(it => it.id === this.damageRoll.locationId)
		this._overrides.rawDR = HitLocationUtil.getHitLocationDR(location, this.damageType) === dr ? undefined : dr
	}

	get overrideRawDR() {
		return this._overrides.rawDR
	}

	private get _isLargeAreaInjury() {
		return this.damageRoll.locationId === DefaultHitLocations.LargeArea
	}

	get armorDivisor() {
		return this._overrides.armorDivisor ?? this.damageRoll.armorDivisor
	}

	get overrideArmorDivisor(): number | undefined {
		return this._overrides.armorDivisor
	}

	set overrideArmorDivisor(value: number | undefined) {
		this._overrides.armorDivisor = this.damageRoll.armorDivisor === value ? undefined : value
	}

	overrideHardenedDR(level: number | undefined) {
		this._overrides.hardenedDR = level
	}

	get hardenedDRLevel(): number {
		return (
			this._overrides.hardenedDR ??
			this.target.getTrait("Damage Resistance")?.getModifier("Hardened")?.levels ??
			0
		)
	}

	get vulnerabilityLevel(): number {
		return this._overrides.vulnerability ?? this.target.vulnerabilityLevel ?? 1
	}

	private get _isCollateralDamage(): boolean {
		return this._isExplosion && this._isAtRange
	}

	private get _isAtRange(): boolean {
		return this.damageRoll.range != null && this.damageRoll.range > 0
	}

	private isTightBeamBurning() {
		return this.damageType === DamageTypes.burn && this.damageRoll.damageModifier === "tbb"
	}
}

export { DamageCalculator, Head, Limb, Extremity, Descriptor }
