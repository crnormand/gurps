import { HitLocation, HitLocationTable } from "@actor/character/data"
import { DiceGURPS } from "@module/dice"

/**
 * Create a HitLocation calculated values block.
 */
interface HitLocationCalc {
	roll_range: string
	dr: Record<string, unknown>
}

/**
 * Extend HitLocationTable.HitLocation to include the calculated values block.
 */
interface HitLocationWithCalc extends HitLocation {
	calc: HitLocationCalc
}

/**
 * Extend Settings.HitLocationTable to change the type of locations to an array of HitLocationWithCalc.
 */
interface HitLocationTableWithCalc extends HitLocationTable {
	locations: HitLocationWithCalc[]
}

/**
 * The target of a damage roll.
 */
interface DamageTarget {
	hitLocationTable: HitLocationTableWithCalc
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DamageAttacker {}

/**
 * Create the definitions of GURPS damage types.
 */
const enum DamageType {
	injury = "injury",
	burn = "burning",
	cor = "corrosive",
	cr = "crushing",
	cut = "cutting",
	fat = "faigue",
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
 * Displays the Apply Damage Dialog. Delegates all the logic behind calculating
 * and applying damage to a character to instance variable _calculator.
 *
 * Takes as input a GurpsActor and DamageData.
 *
 * EXAMPLE DamageData:
 *   let damageData = {
 *     attacker: actor,
 *     dice: '3d+5',
 *     damage: 21,
 *     damageType: 'cut',
 *     armorDivisor: 2
 *   }
 */

class DamageCalculator {
	private _defender: DamageTarget

	private _damageRoll: DamageRoll

	get basicDamage(): number {
		return this._damageRoll.basicDamage
	}

	get penetratingDamage(): number {
		let dr = this.effectiveDR
		return Math.max(this._damageRoll.basicDamage - dr, 0)
	}

	get injury(): number {
		const temp = Math.floor(this.penetratingDamage * this.woundingModifier)
		return this.penetratingDamage > 0 ? Math.max(1, temp) : 0
	}

	get effectiveDR() {
		return Math.floor(this.basicDR / this.effectiveArmorDivisor)
	}

	get effectiveArmorDivisor() {
		return this._damageRoll.armorDivisor === 0 ? 1 : this._damageRoll.armorDivisor
	}

	get basicDR() {
		return (this.targetedHitLocation?.calc.dr?.all as number | undefined) ?? 0
	}

	get woundingModifier(): number {
		return dataTypeMultiplier[this._damageRoll.damageType]
	}

	get defenderHitLocations(): Array<HitLocationWithCalc> {
		return this._defender.hitLocationTable.locations
	}

	get targetedHitLocationId(): string {
		return this._damageRoll.locationId
	}

	get targetedHitLocation(): HitLocationWithCalc | undefined {
		return this.defenderHitLocations.find(it => it.id === this.targetedHitLocationId)
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
	HitLocationWithCalc,
}
