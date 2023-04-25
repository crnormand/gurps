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

type StepName = "Basic Damage" | "Damage Resistance" | "Penetrating Damage" | "Wounding Modifier" | "Injury"

class CalculatorStep {
	constructor(name: StepName, substep: string, value: number, text: string | undefined, notes: string | undefined) {
		this.name = name
		this.substep = substep
		this.value = value
		this.text = text ?? `${value}`
		this.notes = notes
	}

	name: StepName

	substep: string

	value: number

	text: string

	notes?: string
}

class DamageResults {
	results = <Array<CalculatorStep>>[]

	knockback = 0

	effects = <Array<InjuryEffect>>[]

	addResult(result: CalculatorStep | undefined) {
		if (result) this.results.push(result)
	}

	addEffects(effects: InjuryEffect[]) {
		if (effects) this.effects.push(...effects)
	}

	get injury() {
		return this.reverseList.find(it => it.name === "Injury")
	}

	get woundingModifier() {
		return this.reverseList.find(it => it.name === "Wounding Modifier")
	}

	get penetratingDamage() {
		return this.reverseList.find(it => it.name === "Penetrating Damage")
	}

	get damageResistance() {
		return this.reverseList.find(it => it.name === "Damage Resistance")
	}

	get basicDamage() {
		return this.reverseList.find(it => it.name === "Basic Damage")
	}

	get rawDamage() {
		return this.results.find(it => it.name === "Basic Damage" && it.substep === "Basic Damage")
	}

	get shockEffects(): InjuryEffect[] {
		return this.effects.filter(it => it.id === InjuryEffectType.shock)
	}

	get majorWoundEffects(): InjuryEffect[] {
		return this.effects.filter(it => it.id === InjuryEffectType.majorWound)
	}

	private get reverseList(): CalculatorStep[] {
		const temp = [...this.results]
		return temp.reverse()
	}
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

	get injuryResult(): DamageResults {
		const results = new DamageResults()

		// Basic Damage
		results.addResult(this.basicDamageResult)
		results.addResult(this.adjustBasicDamage(results))

		// Damage Resistance
		results.addResult(this.basicDamageResistance)
		results.addResult(this.adjustDamageResistance(results))

		// Peentrating Damge = Basic Damage - Damage Resistance
		results.addResult(this.penetratingDamage(results))

		// Wounding Modifier
		results.addResult(this.basicWoundingModifier)
		results.addResult(this.adjustWoundingModifier(results))

		// Injury = Penetrating Damage * Wounding Modifier
		results.addResult(this.injury(results))
		results.addResult(this.adjustInjury(results))

		results.knockback = this.knockback(results)
		results.addEffects(this.knockbackEffects(results.knockback))
		results.addEffects(this.shockEffects(results))
		results.addEffects(this.majorWoundEffects(results))
		results.addEffects(this.miscellaneousEffects(results))
		return results
	}

	private get basicDamageResult(): CalculatorStep {
		const basic = this._overrides.basicDamage ?? this.damageRoll.basicDamage
		return new CalculatorStep("Basic Damage", "Basic Damage", basic, undefined, "HP")
	}

	private adjustBasicDamage(results: DamageResults): CalculatorStep | undefined {
		const STEP = "Adjusted Damage"

		if (this._isExplosion && this.damageRoll.range) {
			if (this.damageRoll.range > this._diceOfDamage * 2) {
				return new CalculatorStep("Basic Damage", STEP, 0, undefined, "Explosion; Out of range")
			} else {
				return new CalculatorStep(
					"Basic Damage",
					STEP,
					Math.floor(results.basicDamage!.value / (3 * this.damageRoll.range)),
					undefined,
					`Explosion; ${this.damageRoll.range} yards`
				)
			}
		}

		if (this.isKnockbackOnly) return new CalculatorStep("Basic Damage", STEP, 0, undefined, "Knockback only")

		if (this.damageRoll.isHalfDamage) {
			return new CalculatorStep("Basic Damage", STEP, results.basicDamage!.value * 0.5, undefined, "Ranged, 1/2D")
		}

		if (this.multiplierForShotgunExtremelyClose !== 1) {
			return new CalculatorStep(
				"Basic Damage",
				STEP,
				results.basicDamage!.value * this.multiplierForShotgunExtremelyClose,
				undefined,
				`Shotgun, extremely close (×${this.multiplierForShotgunExtremelyClose})`
			)
		}

		return undefined
	}

	private get basicDamageResistance(): CalculatorStep {
		const STEP = "Damage Resistance"

		if (this._overrides.rawDR)
			return new CalculatorStep("Damage Resistance", STEP, this._overrides.rawDR, undefined, "Override")

		let basicDr = 0
		if (this._isLargeAreaInjury) {
			let torso = HitLocationUtil.getHitLocation(this.target.hitLocationTable, Torso)

			let allDR: number[] = this.target.hitLocationTable.locations
				.map(it => HitLocationUtil.getHitLocationDR(it, this.damageType))
				.filter(it => it !== -1)

			basicDr = (HitLocationUtil.getHitLocationDR(torso, this.damageType) + Math.min(...allDR)) / 2
			return new CalculatorStep("Damage Resistance", STEP, basicDr, undefined, "Large Area Injury")
		}

		return new CalculatorStep(
			"Damage Resistance",
			STEP,
			this.drForHitLocation,
			undefined,
			`${this._hitLocation?.choice_name}`
		)
	}

	private adjustDamageResistance(dr: DamageResults): CalculatorStep | undefined {
		const STEP = "Effective DR"

		// Armor Divisor is "Ignores DR"
		if (this._isIgnoreDRArmorDivisor)
			return new CalculatorStep("Damage Resistance", STEP, 0, undefined, "Armor Divisor (Ignores DR)")

		if (this.isInternalExplosion)
			return new CalculatorStep("Damage Resistance", STEP, 0, undefined, "Explosion (Internal)")

		if (this.damageType === DamageTypes.injury)
			return new CalculatorStep("Damage Resistance", STEP, 0, undefined, "Ignores DR")

		if (this.multiplierForShotgunExtremelyClose > 1) {
			return new CalculatorStep(
				"Damage Resistance",
				STEP,
				dr.damageResistance!.value * this.multiplierForShotgunExtremelyClose,
				undefined,
				`Shotgun, extremely close (×${this.multiplierForShotgunExtremelyClose})`
			)
		}

		if (this.effectiveArmorDivisor !== 1) {
			let result = Math.floor(dr.damageResistance!.value / this.effectiveArmorDivisor)
			result = this.effectiveArmorDivisor < 1 ? Math.max(result, 1) : result
			return new CalculatorStep(
				"Damage Resistance",
				STEP,
				result,
				undefined,
				`Armor Divisor (${this.effectiveArmorDivisor})`
			)
		}

		return undefined
	}

	private penetratingDamage(results: DamageResults): CalculatorStep {
		return new CalculatorStep(
			"Penetrating Damage",
			"Penetrating",
			Math.max(results.basicDamage!.value - results.damageResistance!.value, 0),
			undefined,
			`= ${results.basicDamage!.value} – ${results.damageResistance!.value}`
		)
	}

	private get basicWoundingModifier(): CalculatorStep {
		const STEP = "Wounding Modifier"

		if (this._overrides.woundingModifier)
			return new CalculatorStep(
				"Wounding Modifier",
				STEP,
				this._overrides.woundingModifier,
				`×${this.formatFraction(this._overrides.woundingModifier)}`,
				"Override"
			)

		// Fatigue damage always ignores hit location.
		if (this._woundingModifierByDamageType) {
			const modifier = this._woundingModifierByDamageType
			return new CalculatorStep(
				"Wounding Modifier",
				STEP,
				modifier[0],
				`×${this.formatFraction(modifier[0])}`,
				modifier[1]
			)
		}

		// Calculate Wounding Modifier for Hit Location
		const modifier = this.woundingModifierByHitLocation
		if (modifier)
			return new CalculatorStep(
				"Wounding Modifier",
				STEP,
				modifier[0],
				`×${this.formatFraction(modifier[0])}`,
				modifier[1]
			)

		return new CalculatorStep(
			"Wounding Modifier",
			STEP,
			this.damageType.theDefault,
			`×${this.formatFraction(this.damageType.theDefault)}`,
			`${this.damageType.key}, ${this.damageRoll.locationId}`
		)
	}

	/**
	 * @returns {number} wounding modifier only based on hit location.
	 */
	private get woundingModifierByHitLocation(): [number, string] | undefined {
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
		return undefined
	}

	private isTightBeamBurning() {
		return this.damageType === DamageTypes.burn && this.damageRoll.damageModifier === "tbb"
	}

	private adjustWoundingModifier(results: DamageResults): CalculatorStep | undefined {
		const mod = this.modifierByInjuryTolerance
		if (mod && mod[0] !== results.woundingModifier!.value) {
			const newValue = mod[0]
			return new CalculatorStep(
				"Wounding Modifier",
				"Effective Modifier",
				newValue,
				`×${this.formatFraction(newValue)}`,
				mod[1]
			)
		}

		return undefined
	}

	private get modifierByInjuryTolerance(): [number, string] | undefined {
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

		if (this.target.isDiffuse && this.woundingModifierByHitLocation) {
			return [this.damageType.theDefault, "Diffuse (ignores hit location)"]
		}

		return undefined
	}

	private injury(results: DamageResults): CalculatorStep {
		let value = Math.floor(results.woundingModifier!.value * results.penetratingDamage!.value)
		if (results.woundingModifier!.value !== 0 && value === 0 && results.penetratingDamage!.value > 0) value = 1
		return new CalculatorStep(
			"Injury",
			"Injury",
			value,
			undefined,
			`= ${results.penetratingDamage!.value} × ${this.formatFraction(results.woundingModifier!.value)}`
		)
	}

	private adjustInjury(results: DamageResults): CalculatorStep | undefined {
		// Adjust for Vulnerability
		if (this.vulnerabilityLevel !== 1) {
			let temp = results.injury!.value * this.vulnerabilityLevel
			return new CalculatorStep(
				"Injury",
				"Adjusted Injury",
				temp,
				undefined,
				`= ${results.injury!.value} × ${this.vulnerabilityLevel} (Vulnerability)`
			)
		}

		// Adjust for Damage Reduction.
		if (this._damageReductionValue !== 1) {
			const newValue = results.injury!.value / this._damageReductionValue
			return new CalculatorStep(
				"Injury",
				"Adjusted Injury",
				newValue,
				undefined,
				`= ${results.injury!.value} ÷ ${this._damageReductionValue} (Damage Reduction)`
			)
		}

		// Adjust for Injury Tolerance. This must be before Hit Location or Trauma.
		let newValue = Math.min(results.injury!.value, this.maximumForInjuryTolerance[0])
		if (newValue < results.injury!.value) {
			return new CalculatorStep(
				"Injury",
				"Adjusted Injury",
				newValue,
				undefined,
				this.maximumForInjuryTolerance[1]
			)
		}

		// Adjust for hit location.
		newValue = Math.min(results.injury!.value, this.maximumForHitLocation[0])
		if (newValue < results.injury!.value) {
			return new CalculatorStep("Injury", "Adjusted Injury", newValue, undefined, this.maximumForHitLocation[1])
		}

		// Adjust for blunt trauma.
		if (this.isBluntTrauma(results)) {
			return new CalculatorStep("Injury", "Adjusted Injury", this.bluntTrauma(results), undefined, "Blunt Trauma")
		}

		return undefined
	}

	private isBluntTrauma(results: DamageResults): boolean {
		return (
			this.isFlexibleArmor &&
			results.penetratingDamage!.value === 0 &&
			this.isBluntTraumaDamageType &&
			this.bluntTrauma(results) > 0
		)
	}

	/**
	 * @returns {number} the amount of blunt trauma damage, if any.
	 */
	private bluntTrauma(results: DamageResults): number {
		if (this.damageType === DamageTypes.fat) return 0

		if (results.penetratingDamage!.value > 0 || !this.isFlexibleArmor) return 0
		return this.bluntTraumaDivisor > 0 ? Math.floor(results.basicDamage!.value / this.bluntTraumaDivisor) : 0
	}

	/**
	 * @returns {number} the divisor used to determine amount of blunt trauma; this is a fraction
	 * of the total damage done.
	 */
	private get bluntTraumaDivisor(): number {
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

	private get isBluntTraumaDamageType(): boolean {
		return [DamageTypes.cr, DamageTypes.cut, DamageTypes.imp, ...AnyPiercingType].includes(this.damageType)
	}

	/**
	 * @returns {number} yards of knockback, if any.
	 */
	private knockback(results: DamageResults): number {
		if (this._isDamageTypeKnockbackEligible) {
			if (this.damageType === DamageTypes.cut && results.penetratingDamage!.value > 0) return 0

			const knockbackYards = Math.floor(results.rawDamage!.value / (this._knockbackResistance - 2))
			return knockbackYards
		}
		return 0
	}

	private get _isDamageTypeKnockbackEligible() {
		return [DamageTypes.cr, DamageTypes.cut, DamageTypes.kb].includes(this.damageType)
	}

	private get _knockbackResistance() {
		return this.target.ST
	}

	private knockbackEffects(knockback: number): InjuryEffect[] {
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

	private shockEffects(results: DamageResults): InjuryEffect[] {
		let rawModifier = Math.floor(results.injury!.value / this._shockFactor)
		if (rawModifier > 0) {
			let modifier = Math.min(4, rawModifier) * -1

			// TODO In RAW, this doubling only occurs if the target is physiologically male and does not have the
			// 	 "No Vitals" Injury Tolerance trait.
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

	private majorWoundEffects(results: DamageResults): InjuryEffect[] {
		const wounds = []

		// Fatigue attacks and Injury Tolerance (Homogenous) ignore hit location.
		if (this.damageType === DamageTypes.fat || this.target.isHomogenous || this.target.isDiffuse) {
			if (this.isMajorWound(results))
				wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck()]))
		} else {
			switch (this.damageRoll.locationId) {
				case "torso":
					if (this.isMajorWound(results))
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck()]))
					break

				case "skull":
				case "eye":
					if (results.shockEffects.length > 0 || this.isMajorWound(results)) {
						let penalty = this.damageType !== DamageTypes.tox && !this.target.hasTrait("No Brain") ? -10 : 0
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(penalty)]))
					}
					break

				case "vitals":
					if (results.shockEffects.length > 0) {
						const penalty = this.target.hasTrait("No Vitals") ? 0 : -5
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(penalty)]))
					}
					break

				case "face":
					if (this.isMajorWound(results))
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(-5)]))
					break

				case "groin":
					if (this.isMajorWound(results)) {
						const penalty = this.target.hasTrait("No Vitals") ? 0 : -5
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck(penalty)]))
					}
					break

				default:
					if (this.isMajorWound(results))
						wounds.push(new InjuryEffect(InjuryEffectType.majorWound, [], [new KnockdownCheck()]))
			}
		}

		return wounds
	}

	private isMajorWound(results: DamageResults): boolean {
		let divisor = Extremity.includes(this.damageRoll.locationId) ? 3 : 2
		return results.injury!.value > this.target.hitPoints.value / divisor
	}

	private miscellaneousEffects(results: DamageResults): InjuryEffect[] {
		if (this.damageRoll.locationId === "eye" && results.injury!.value > this.target.hitPoints.value / 10)
			return [new InjuryEffect(InjuryEffectType.eyeBlinded)]

		if (this.damageRoll.locationId === "face" && this.isMajorWound(results)) {
			return results.injury!.value > this.target.hitPoints.value
				? [new InjuryEffect(InjuryEffectType.blinded)]
				: [new InjuryEffect(InjuryEffectType.eyeBlinded)]
		}

		if (Limb.includes(this.damageRoll.locationId) && this.isMajorWound(results)) {
			return [new InjuryEffect(InjuryEffectType.limbCrippled)]
		}

		if (Extremity.includes(this.damageRoll.locationId) && this.isMajorWound(results)) {
			return [new InjuryEffect(InjuryEffectType.limbCrippled)]
		}

		return []
	}

	/**
	 * @returns the maximum injury based on hit location, or Infinity if none.
	 */
	private get maximumForHitLocation(): [number, string] {
		if (Limb.includes(this.damageRoll.locationId)) {
			const max = Math.floor(this.target.hitPoints.value / 2) + 1
			return [max, `Maximum ${max} (${this.damageRoll.locationId})`]
		}

		if (Extremity.includes(this.damageRoll.locationId)) {
			const max = Math.floor(this.target.hitPoints.value / 3) + 1
			return [max, `Maximum ${max} (${this.damageRoll.locationId})`]
		}

		return [Infinity, ""]
	}

	/**
	 * @returns {number} the maximum injury based on Injury Tolerance, or Infinity.
	 */
	private get maximumForInjuryTolerance(): [number, string] {
		if (this.target.isDiffuse) {
			if ([DamageTypes.imp, ...AnyPiercingType].includes(this.damageType)) return [1, "Maximum 1 (Diffuse)"]
			return [2, "Maximum 2 (Diffuse)"]
		}
		return [Infinity, ""]
	}

	private get _woundingModifierByDamageType(): [number, string] | undefined {
		// Fatigue damage always ignores hit location.
		if (this.damageType === DamageTypes.fat) return [1, "Fatigue ignores Hit Location"]
		return undefined
	}

	private get multiplierForShotgunExtremelyClose() {
		return this.damageRoll.isShotgunCloseRange ? Math.floor(this.damageRoll.rofMultiplier / 2) : 1
	}

	private get _isIgnoreDRArmorDivisor(): boolean {
		return this.effectiveArmorDivisor === 0
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

		index += this.hardenedDRLevel
		if (index > armorDivisors.length - 1) index = armorDivisors.length - 1

		return armorDivisors[index]
	}

	formatFraction(value: number) {
		if (value === 0.5) return "1/2"
		if (value === 1 / 3) return "1/3"
		if (value === 0.2) return "1/5"
		if (value === 0.1) return "1/10"
		return `${value}`
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

	private get damageType(): DamageType {
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

	private get isKnockbackOnly() {
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

	get drForHitLocation(): number {
		return this._overrides.rawDR ?? HitLocationUtil.getHitLocationDR(this._hitLocation, this.damageType)
	}

	set overrideRawDr(dr: number | undefined) {
		this._overrides.rawDR =
			HitLocationUtil.getHitLocationDR(this._hitLocation, this.damageType) === dr ? undefined : dr
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
}

export { DamageCalculator, Head, Limb, Extremity, CalculatorStep as Descriptor, DamageResults }
