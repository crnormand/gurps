import { DiceGURPS } from "@module/dice"
import { TraitGURPS } from "@item"

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
 * Most commonly implemented as a wrapper on CharacterGURPS.
 */
type HitPointsCalc = { value: number; current: number }
interface DamageTarget {
	// CharacterGURPS.attributes.get(gid.HitPoints).calc
	hitPoints: HitPointsCalc
	// CharacterGURPS.system.settings.body_type
	hitLocationTable: HitLocationTableWithCalc
	// CharacterGURPS.traits.contents.filter(it => it instanceof TraitGURPS)
	traits: Array<TraitGURPS>
	//
	hasTrait(name: string): boolean
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

type DamageTypeData = {
	[key in DamageType]: number
}

const dataTypeMultiplier: DamageTypeData = {
	[DamageType.injury]: 1,
	[DamageType.burn]: 1,
	[DamageType.cor]: 1,
	[DamageType.cr]: 1,
	[DamageType.cut]: 1.5,
	[DamageType.fat]: 1,
	[DamageType.imp]: 2,
	[DamageType.pi_m]: 0.5,
	[DamageType.pi]: 1,
	[DamageType.pi_p]: 1.5,
	[DamageType.pi_pp]: 2,
	[DamageType.tox]: 1,
	[DamageType.kb]: 1,
}

/**
 * This class represents some effect of sudden injury.
 *
 * Right now, it is just data. At some point in the future, some of them may become Active Effects.
 */
class InjuryEffect {
	modifier: number

	traits: Array<string>

	text: string

	constructor(modifier: number, traits: Array<string>, text: string) {
		this.modifier = modifier
		this.traits = traits
		this.text = text
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
	private _defender: DamageTarget

	private _damageRoll: DamageRoll

	/**
	 * @returns {number} - The basic damage; typically directly from the damage roll.
	 */
	get basicDamage(): number {
		return this._damageRoll.basicDamage
	}

	/**
	 * @returns {number} - The amount of damage that penetrates any DR.
	 */
	get penetratingDamage(): number {
		let dr = this._effectiveDR
		return Math.max(this._damageRoll.basicDamage - dr, 0)
	}

	/**
	 * @returns {number} - The final amount of damage inflicted on the defender (does not consider blunt trauma).
	 */
	get injury(): number {
		const temp = Math.floor(this.penetratingDamage * this._woundingModifier)
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
		if (this.injury <= 0) return []

		return [new InjuryEffect(-1 * this.injury, ["IQ", "DX"], "Shock")]
	}

	private get _bluntTraumaDivisor() {
		if (this._damageRoll.damageType === DamageType.cr) return 5
		if (
			[
				DamageType.cut,
				DamageType.imp,
				DamageType.pi,
				DamageType.pi_m,
				DamageType.pi_p,
				DamageType.pi_pp,
			].includes(this._damageRoll.damageType)
		)
			return 10
		return 0
	}

	private get _effectiveDR() {
		return Math.floor(this._basicDR / this._effectiveArmorDivisor)
	}

	private get _effectiveArmorDivisor() {
		return this._damageRoll.armorDivisor === 0 ? 1 : this._damageRoll.armorDivisor
	}

	private get _basicDR() {
		return (this._targetedHitLocation?.calc.dr?.all as number | undefined) ?? 0
	}

	private get _woundingModifier(): number {
		return dataTypeMultiplier[this._damageRoll.damageType]
	}

	private get _defenderHitLocations(): Array<HitLocation> {
		return this._defender.hitLocationTable.locations
	}

	private get _targetedHitLocationId(): string {
		return this._damageRoll.locationId
	}

	private get _targetedHitLocation(): HitLocation | undefined {
		return this._defenderHitLocations.find(it => it.id === this._targetedHitLocationId)
	}

	constructor(damageRoll: DamageRoll, defender: DamageTarget) {
		this._damageRoll = damageRoll
		this._defender = defender
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
