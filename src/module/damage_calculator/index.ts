import { DiceGURPS } from "@module/dice"
import { RollType } from "../data"
import { DamageTarget } from "./damage_target"
import { AnyPiercingType, DamageType, dataTypeMultiplier } from "./damage_type"
import { HitLocation } from "./hit_location"
import { _function } from "./utils"

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DamageAttacker {}

enum DefaultHitLocations {
	Default = "Default",
	Random = "Random",
}

interface DamageRoll {
	locationId: string | DefaultHitLocations
	attacker: DamageAttacker
	dice: DiceGURPS
	basicDamage: number
	damageType: DamageType
	// Possible values: tbb.
	damageModifier: string
	armorDivisor: number | "Ignore"
}

/**
 * ModifierEffect represents a generic modifier to some kind of roll.
 *
 * modifier - the numeric value used to modify the roll or check.
 * rollType - the type of the roll/check modified.
 * id - either the id of an attribute or name of the thing (skill, spell, etc).
 */
class CheckModifier {
	modifier: number

	rollType: RollType

	id: string

	constructor(id: string, rollType: RollType, modifier: number) {
		this.id = id
		this.rollType = rollType
		this.modifier = modifier
	}
}

/**
 * An injury effect that requires a check of some kind.
 *
 * failure - an array of 'consequences' of failing the check.
 */
class InjuryEffectCheck {
	checks: CheckModifier[]

	failures: CheckFailureConsequence[]

	constructor(checks: CheckModifier[], failures: CheckFailureConsequence[]) {
		this.checks = checks
		this.failures = failures
	}
}

/**
 * The consequence of failing a check.
 *
 * margin - "margin of failure" at which this effect is applied.
 * id - the identifier of a consequence.
 */
class CheckFailureConsequence {
	margin: number

	// "fall prone", "stun", "unconscious", ...
	id: string

	constructor(id: string, margin: number) {
		this.id = id
		this.margin = margin
	}
}

/**
 * TODO I'm kind of torn on this ... maybe it should just be a string, rather than an enum?
 */
enum InjuryEffectType {
	shock = "shock",
	majorWound = "majorWound",
	knockback = "knockback",
}

/**
 * This class represents some effect of sudden injury.
 *
 * Right now, it is just data. At some point in the future, some of them may become Active Effects.
 */
class InjuryEffect {
	id: string

	modifiers: CheckModifier[]

	checks: InjuryEffectCheck[]

	constructor(id: string, modifiers: CheckModifier[] = [], checks: InjuryEffectCheck[] = []) {
		this.id = id
		this.modifiers = modifiers
		this.checks = checks
	}
}

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

	/**
	 * @returns {number} - The basic damage; typically directly from the damage roll.
	 */
	get basicDamage(): number {
		return this._damageRoll.damageType === DamageType.kb ? 0 : this._basicDamage
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
		if (this.penetratingDamage > 0 || !this._targetedHitLocation?.calc.flexible) return 0
		return this._bluntTraumaDivisor > 0 ? Math.floor(this.basicDamage / this._bluntTraumaDivisor) : 0
	}

	/**
	 * @returns {Array<InjuryEffect>} - The list of injury effects caused by this damage.
	 */
	get injuryEffects(): Array<InjuryEffect> {
		let effects: InjuryEffect[] = []

		effects.push(...this._shockEffects)
		effects.push(...this._majorWoundEffects)
		effects.push(...this._knockbackEffects)

		return effects
	}

	get knockback() {
		if ([DamageType.cr, DamageType.cut, DamageType.kb].includes(this._damageRoll.damageType)) {
			if (this._damageRoll.damageType === DamageType.cut && this.penetratingDamage > 0) return 0

			return Math.floor(this._basicDamage / (this._knockbackResistance - 2))
		}
		return 0
	}

	private get _knockbackResistance() {
		return this._target.ST
	}

	private get _shockEffects(): InjuryEffect[] {
		let rawModifier = Math.floor(this.injury / this._shockFactor)
		if (rawModifier > 0) {
			let modifier = Math.min(4, rawModifier) * -1
			const shockEffect = new InjuryEffect(InjuryEffectType.shock, [
				new CheckModifier("dx", RollType.Attribute, modifier),
				new CheckModifier("iq", RollType.Attribute, modifier),
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
		if (this.injury > this._target.hitPoints.value / 2) {
			let effect = new InjuryEffect(InjuryEffectType.majorWound, [])

			/**
			 * TODO
			 * To be honest, hardcoding the effects of major wounmds for a hit location probably doesn't work in every
			 * case, especially for non-standard/non-humanoid body types. It might be better if the effects were
			 * captured on the actor.system.settings.body_type hit location data.
			 *
			 * Perhaps the default algorithm would be: look up the hit location on the actor to see if it has major
			 * wound effects, otherwise use the hardcoded values here.
			 */
			if (this._damageRoll.locationId === "torso") {
				const htCheck = new InjuryEffectCheck(
					[new CheckModifier("ht", RollType.Attribute, 0)],
					[
						new CheckFailureConsequence("stun", 0),
						new CheckFailureConsequence("fall prone", 0),
						new CheckFailureConsequence("unconscious", 5),
					]
				)
				effect.checks.push(htCheck)
			}

			wounds.push(effect)
		}
		return wounds
	}

	private get _knockbackEffects(): InjuryEffect[] {
		let knockback = this.knockback
		if (knockback === 0) return []

		let penalty = knockback === 1 ? 0 : -1 * (knockback - 1)

		if (this._target.hasTrait("Perfect Balance")) penalty += 4

		const knockbackEffect = new InjuryEffect(
			InjuryEffectType.knockback,
			[],
			[
				new InjuryEffectCheck(
					[
						new CheckModifier("dx", RollType.Attribute, penalty),
						new CheckModifier("Acrobatics", RollType.Skill, penalty),
						new CheckModifier("Judo", RollType.Skill, penalty),
					],
					[new CheckFailureConsequence("fall prone", 0)]
				),
			]
		)
		return [knockbackEffect]
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
		if (this._effectiveArmorDivisor === "Ignore") return 0

		let dr =
			this._damageRoll.damageType === DamageType.injury
				? 0
				: Math.floor(this._basicDR / this._effectiveArmorDivisor)

		// If the AD is a fraction, minimum DR is 1.
		return this._effectiveArmorDivisor < 1 ? Math.max(dr, 1) : dr
	}

	private get _effectiveArmorDivisor() {
		return this._damageRoll.armorDivisor === 0 ? 1 : this._damageRoll.armorDivisor
	}

	private get _basicDR() {
		return (this._targetedHitLocation?.calc.dr?.all as number | undefined) ?? 0
	}

	private get _woundingModifier(): _function {
		const multiplier = dataTypeMultiplier[this._damageRoll.damageType]
		if (this._target.isUnliving) return multiplier.unliving
		if (this._target.isHomogenous) return multiplier.homogenous

		/**
		 * TODO
		 * Diffuse: Exception: Area-effect, cone, and explosion attacks cause normal injury.
		 */
		if (this._target.isDiffuse) return multiplier.diffuse

		// --- Calculate Wounding Modifier for Hit Location. ---
		if (
			this._damageRoll.locationId === "vitals" &&
			[DamageType.imp, ...AnyPiercingType].includes(this._damageRoll.damageType)
		)
			return x => x * 3

		if (
			this._damageRoll.locationId === "vitals" &&
			this._damageRoll.damageType === DamageType.burn &&
			this._damageRoll.damageModifier === "tbb"
		)
			return x => x * 2

		if (this._damageRoll.locationId === "skull" && this._damageRoll.damageType !== DamageType.tox) return x => x * 4

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

	constructor(damageRoll: DamageRoll, defender: DamageTarget) {
		this._damageRoll = damageRoll
		this._target = defender
	}
}

export { AnyPiercingType, DamageCalculator, DamageRoll, DamageType, DamageAttacker, DefaultHitLocations }
