import { HitLocation, HitLocationTable } from "@actor/character/hit_location"
import {
	DamageAttacker,
	DamageRoll,
	DamageTarget,
	TargetTrait,
	TargetTraitModifier,
	Vulnerability,
} from "@module/damage_calculator"
import { DamageCalculator, DamageResults } from "@module/damage_calculator/damage_calculator"
import { DamageTypes } from "@module/damage_calculator/damage_type"
// import { InjuryEffect } from "@module/damage_calculator/injury_effect"
import { DiceGURPS } from "@module/dice"
import { TooltipGURPS } from "@module/tooltip"

export class _Attacker implements DamageAttacker {
	name = "Arnold"
}

export class _Target implements DamageTarget {
	getTraits(name: string): TargetTrait[] {
		return this._traits.filter(it => it.name === name)
	}

	name = "doesn't matter"

	isDiffuse = false

	isHomogenous = false

	isUnliving = false

	ST = 12

	hitPoints = { value: 15, current: 10 }

	_traits: TargetTrait[] = []

	getTrait(name: string) {
		return this._traits.find(it => it.name === name)
	}

	hasTrait(name: string): boolean {
		return !!this.getTrait(name)
	}

	_dummyHitLocationTable = {
		name: "humanoid",
		roll: new DiceGURPS("3d"),
		// eslint-disable-next-line no-array-constructor
		locations: new Array<HitLocation>(),
	}

	get hitLocationTable(): HitLocationTable {
		return this._dummyHitLocationTable
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	incrementDamage(delta: number): void {}
}

export class _DamageRoll implements DamageRoll {
	damageText = ""

	damageTypeKey = ""

	applyTo = "HP"

	// Not a real location id, which should be something like "torso".
	locationId = "dummy"

	attacker = new _Attacker()

	dice = new DiceGURPS("2d")

	basicDamage = 0

	damageType = DamageTypes.cr

	weapon = undefined

	range = null

	damageModifier = ""

	armorDivisor = 1

	isHalfDamage = false

	isShotgunCloseRange = false

	rofMultiplier = 1

	internalExplosion = false
}

export const Knockdown = [
	{ id: "stun", margin: 0 },
	{ id: "fall prone", margin: 0 },
	{ id: "unconscious", margin: 5 },
]

export type DamageShock = { damage: number; shock: number }

interface IDamageCalculator {
	results: DamageResults
	overrideFlexible(arg: boolean | undefined): void
	vulnerabilities: Vulnerability[]
}

export const _create = function (roll: DamageRoll, target: DamageTarget): IDamageCalculator {
	return new DamageCalculator(roll, target)
}

export class _TargetTrait implements TargetTrait {
	name: string

	levels: number

	constructor(name: string, levels: number) {
		this.name = name
		this.levels = levels
	}

	getModifier(name: string): TargetTraitModifier | undefined {
		return this.modifiers.find(it => it.name === name)
	}

	modifiers: TargetTraitModifier[] = []
}

export class _TargetTraitModifier implements TargetTraitModifier {
	levels: number

	name: string

	constructor(name: string, levels: number) {
		this.name = name
		this.levels = levels
	}
}

export class DamageHitLocation extends HitLocation {
	_map: Map<string, number> = new Map()

	_DR(_tooltip?: TooltipGURPS, _drMap: Map<string, number> = new Map()): Map<string, number> {
		return this._map
	}
}
