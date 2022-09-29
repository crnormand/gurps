import { TraitGURPS } from "@item"
import { DiceGURPS } from "@module/dice"
import { RollType } from "../data"

/**
 * Extend Settings.HitLocationTable to change the type of locations to an array of HitLocationWithCalc.
 */
type HitLocationCalc = { roll_range: string; dr: Record<string, any>; flexible: boolean }
type HitLocation = {
	calc: HitLocationCalc
	choice_name: string
	description: string
	dr_bonus: number
	hit_penalty: number
	id: string
	slots: number
	table_name: string
}

interface HitLocationTableWithCalc {
	name: string
	roll: string
	locations: HitLocation[]
}

/**
 * The target of a damage roll.
 *
 * Most commonly implemented as a CharacterGURPS adapter/façade.
 * (See https://java-design-patterns.com/patterns/adapter/).
 */
type HitPointsCalc = { value: number; current: number }
interface DamageTarget {
	// CharacterGURPS.attributes.get(gid.ST).calc.value
	ST: number
	// CharacterGURPS.attributes.get(gid.HitPoints).calc
	hitPoints: HitPointsCalc
	// CharacterGURPS.system.settings.body_type
	// TODO It would be better to have a method to return DR directly; this would allow DR overrides.
	hitLocationTable: HitLocationTableWithCalc
	// CharacterGURPS.traits.contents.filter(it => it instanceof TraitGURPS)
	traits: Array<TraitGURPS>
	//
	hasTrait(name: string): boolean
	// This.hasTrait("Injury Tolerance (Unliving)").
	isUnliving: boolean
	// This.hasTrait("Injury Tolerance (Homogenous)").
	isHomogenous: boolean
	// This.hasTrait("Injury Tolerance (Diffuse)").
	isDiffuse: boolean
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DamageAttacker {}

/**
 * Create the definitions of GURPS damage types.
 */
enum DamageType {
	injury = "injury",
	burn = "burning",
	cor = "corrosive",
	cr = "crushing",
	cut = "cutting",
	fat = "fatigue",
	imp = "impaling",
	pi_m = "small piercing",
	pi = "piercing",
	pi_p = "large piercing",
	pi_pp = "huge piercing",
	tox = "toxic",
	// TODO Should we include "knockback only" as a damage type?
	kb = "knockback only",
}

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
	armorDivisor: number
}

type _function = (x: number) => number
const identity: _function = x => x
const max1: _function = x => Math.min(x, 1)
const max2: _function = x => Math.min(x, 2)
const oneHalf: _function = x => x * 0.5
const oneAndOneHalf: _function = x => x * 1.5
const double: _function = x => x * 2
const oneThird: _function = x => x * (1 / 3)
const oneFifth: _function = x => x * 0.2
const oneTenth: _function = x => x * 0.1

type DamageTypeData = {
	[key in DamageType]: {
		theDefault: _function
		unliving: _function
		homogenous: _function
		diffuse: _function
	}
}

const dataTypeMultiplier: DamageTypeData = {
	[DamageType.injury]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.burn]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.cor]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.cr]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.cut]: {
		theDefault: oneAndOneHalf,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.fat]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.imp]: {
		theDefault: double,
		unliving: identity,
		homogenous: oneHalf,
		diffuse: max1,
	},
	[DamageType.pi_m]: {
		theDefault: oneHalf,
		unliving: oneFifth,
		homogenous: oneTenth,
		diffuse: max1,
	},
	[DamageType.pi]: {
		theDefault: identity,
		unliving: oneThird,
		homogenous: oneFifth,
		diffuse: max1,
	},
	[DamageType.pi_p]: {
		theDefault: oneAndOneHalf,
		unliving: identity,
		homogenous: oneThird,
		diffuse: max1,
	},
	[DamageType.pi_pp]: {
		theDefault: double,
		unliving: identity,
		homogenous: oneHalf,
		diffuse: max1,
	},
	[DamageType.tox]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
	[DamageType.kb]: {
		theDefault: identity,
		unliving: identity,
		homogenous: identity,
		diffuse: max2,
	},
}

/**
 * ModifierEffect represents a generic modifier to some kind of roll.
 *
 * modifier - the numeric value used to modify the roll or check.
 * rollType - the type of the roll/check modified.
 * id - either the id of an attribute or name of the thing (skill, spell, etc).
 */
class ModifierEffect {
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
class InjuryEffectCheck extends ModifierEffect {
	failures: CheckFailureConsequence[]

	constructor(id: string, rollType: RollType, modifier: number, failures: CheckFailureConsequence[]) {
		super(id, rollType, modifier)

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

	id: string

	constructor(id: string, margin: number) {
		this.id = id
		this.margin = margin
	}
}

enum InjuryEffectType {
	shock = "shock",
	majorWound = "majorWound",
}

/**
 * This class represents some effect of sudden injury.
 *
 * Right now, it is just data. At some point in the future, some of them may become Active Effects.
 */
class InjuryEffect {
	id: string

	effects: ModifierEffect[]

	constructor(id: string, effects: ModifierEffect[] = []) {
		this.effects = effects
		this.id = id
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

		effects.push(...this._shockEffect)
		effects.push(...this._majorWoundEffect)

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

	private get _shockEffect(): InjuryEffect[] {
		let rawModifier = Math.floor(this.injury / this._shockFactor)
		if (rawModifier > 0) {
			let modifier = Math.min(4, rawModifier) * -1
			const shockEffect = new InjuryEffect(InjuryEffectType.shock, [
				{ id: "dx", rollType: RollType.Attribute, modifier: modifier },
				{ id: "iq", rollType: RollType.Attribute, modifier: modifier },
			])
			return [shockEffect]
		}
		return []
	}

	private get _majorWoundEffect(): InjuryEffect[] {
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
				const htCheck = new InjuryEffectCheck("ht", RollType.Attribute, 0, [
					new CheckFailureConsequence("stun", 0),
					new CheckFailureConsequence("knocked down", 0),
					new CheckFailureConsequence("unconscious", 5),
				])
				effect.effects.push(htCheck)
			}

			wounds.push(effect)
		}
		return wounds
	}

	private get _shockFactor(): number {
		return Math.floor(this._target.hitPoints.value / 10)
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
		return this._damageRoll.damageType === DamageType.injury
			? 0
			: Math.floor(this._basicDR / this._effectiveArmorDivisor)
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

export {
	DamageCalculator,
	DamageTarget,
	DamageRoll,
	DamageType,
	DamageAttacker,
	DefaultHitLocations,
	HitLocationTableWithCalc,
	HitLocation,
}
