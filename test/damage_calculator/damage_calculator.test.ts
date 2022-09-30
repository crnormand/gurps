/* eslint-disable jest/no-disabled-tests */
import { TraitGURPS } from "@item"
import { DamageCalculator } from "../../src/module/damage_calculator"
import { DiceGURPS } from "../../src/module/dice"
import { RollType } from "../../src/module/data"
import { DamageTarget } from "../../src/module/damage_calculator/damage_target"
import { HitLocation, HitLocationTableWithCalc } from "../../src/module/damage_calculator/hit_location"
import { AnyPiercingType, DamageType } from "../../src/module/damage_calculator/damage_type"
import { DamageAttacker, DamageRoll } from "../../src/module/damage_calculator/damage_roll"
import { InjuryEffectType } from "../../src/module/damage_calculator/injury_effect"

class _Attacker implements DamageAttacker {}

class _Target implements DamageTarget {
	isDiffuse = false

	isHomogenous = false

	isUnliving = false

	ST = 12

	hitPoints = { value: 15, current: 10 }

	traits: TraitGURPS[] = []

	hasTrait(name: string): boolean {
		return this._traits.includes(name)
	}

	_dummyHitLocationTable = {
		name: "humanoid",
		roll: "3d",
		// eslint-disable-next-line no-array-constructor
		locations: new Array<HitLocation>(),
	}

	get hitLocationTable(): HitLocationTableWithCalc {
		return this._dummyHitLocationTable
	}

	_traits: string[] = []
}

class _DamageRoll implements DamageRoll {
	// Not a real location id, which should be something like "torso".
	locationId = "dummy"

	attacker = new _Attacker()

	dice = new DiceGURPS("2d")

	basicDamage = 0

	damageType = DamageType.cr

	damageModifier = ""

	armorDivisor = 1
}

// Add real tests here.
describe("Damage calculator", () => {
	let _attacker: DamageAttacker
	let _target: _Target
	let _roll: DamageRoll
	let _location: HitLocation

	beforeEach(() => {
		_location = {
			calc: {
				dr: { all: 0 },
				roll_range: "9-10",
				flexible: false,
			},
			choice_name: "Torso",
			description: "",
			dr_bonus: 0,
			table_name: "Torso",
			hit_penalty: 0,
			id: "torso",
			slots: 2,
		}

		_attacker = new _Attacker()
		_target = new _Target()
		_roll = new _DamageRoll()
		_roll.attacker = _attacker
		_roll.basicDamage = 8
		_roll.armorDivisor = 1
		_roll.damageType = DamageType.cr
		_roll.dice = new DiceGURPS("2d")
		_roll.locationId = "torso"
	})

	describe("B378: Damage Roll.", () => {
		it("The result of the damage roll ... is the hit’s “basic damage.”", () => {
			_roll.basicDamage = 8
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.basicDamage).toBe(8)

			_roll.basicDamage = 4
			calc = new DamageCalculator(_roll, _target)
			expect(calc.basicDamage).toBe(4)
		})

		it("(Knockback Only does no damage.)", () => {
			_roll.basicDamage = 8
			_roll.damageType = DamageType.kb
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.basicDamage).toBe(0)
		})
	})

	describe("B378: Damage Resistance and Penetration. Subtract DR from basic damage. The result is the “penetrating damage”", () => {
		it("If your foe has no DR, the entire damage roll is penetrating damage.", () => {
			_roll.basicDamage = 8
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(8)
			expect(calc.injury).toBe(calc.penetratingDamage)

			_roll.basicDamage = 15
			calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(15)
			expect(calc.injury).toBe(calc.penetratingDamage)
		})

		it("If your target has any Damage Resistance (DR) he subtracts this from your damage roll.", () => {
			_roll.basicDamage = 8
			_location.calc.dr.all = 2
			_target.hitLocationTable.locations.push(_location)

			let calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(6)
			expect(calc.injury).toBe(calc.penetratingDamage)

			_roll.basicDamage = 11
			calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(9)
			expect(calc.injury).toBe(calc.penetratingDamage)
		})

		it("If your damage roll is less than or equal to your target’s effective DR, your attack failed to penetrate.", () => {
			_roll.basicDamage = 5
			_location.calc.dr.all = 9
			_target.hitLocationTable.locations.push(_location)

			let calc: DamageCalculator = new DamageCalculator(_roll, _target)

			expect(calc.injury).toBe(0)
			expect(calc.injury).toBe(calc.penetratingDamage)

			_roll.basicDamage = 9
			calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(0)
			expect(calc.injury).toBe(calc.penetratingDamage)
		})

		it("(Direct Injury ignores DR.", () => {
			_roll.damageType = DamageType.injury
			_location.calc.dr.all = 2
			_target.hitLocationTable.locations.push(_location)

			_roll.basicDamage = 8
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(8)
			expect(calc.injury).toBe(calc.penetratingDamage)

			_roll.basicDamage = 11
			calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(11)
			expect(calc.injury).toBe(calc.penetratingDamage)
		})
	})

	describe("B378: Armor Divisors and Penetration Modifiers.", () => {
		describe("A divisor of (2) or more means that DR protects at reduced value against the attack.", () => {
			it("Divide the target’s DR by the number in parentheses before subtracting it from basic damage; e.g., (2) means DR protects at half value.", () => {
				_location.calc.dr.all = 20
				_target.hitLocationTable.locations.push(_location)
				_roll.basicDamage = 20

				let divisors = [2, 5, 10]
				let expected = [10, 16, 18]
				for (let i = 0; i < divisors.length; i++) {
					_roll.armorDivisor = divisors[i]
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.injury).toBe(expected[i])
				}
			})

			it("Round DR down. Minimum DR is 0.", () => {
				_location.calc.dr.all = 5
				_target.hitLocationTable.locations.push(_location)
				_roll.basicDamage = 20

				let divisors = [2, 3, 5, 10]
				let expected = [18, 19, 19, 20]
				for (let i = 0; i < divisors.length; i++) {
					_roll.armorDivisor = divisors[i]
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.injury).toBe(expected[i])
				}
			})

			it("(Cosmic: Ignores DR.)", () => {
				_location.calc.dr.all = 20
				_target.hitLocationTable.locations.push(_location)
				_roll.basicDamage = 20
				_roll.armorDivisor = 0
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.injury).toBe(20)
			})
		})

		describe("Some divisors are fractions, such as (0.5), (0.2), or (0.1). DR is increased against such attacks:", () => {
			it("... multiply DR by 2 for (0.5),", () => {
				_location.calc.dr.all = 5
				_target.hitLocationTable.locations.push(_location)
				_roll.basicDamage = 20

				_roll.armorDivisor = 0.5
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.injury).toBe(10)
			})

			it("... by 5 for (0.2),", () => {
				_location.calc.dr.all = 3
				_target.hitLocationTable.locations.push(_location)
				_roll.basicDamage = 20

				_roll.armorDivisor = 0.2
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.injury).toBe(5)
			})

			it("... and by 10 for (0.1).", () => {
				_location.calc.dr.all = 2
				_target.hitLocationTable.locations.push(_location)
				_roll.basicDamage = 21

				_roll.armorDivisor = 0.1
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.injury).toBe(1)
			})

			it("In addition, if you have any level of this limitation, targets that have DR 0 get DR 1 against your attack.", () => {
				_location.calc.dr.all = 0
				_target.hitLocationTable.locations.push(_location)
				_roll.basicDamage = 20
				_roll.armorDivisor = 0.5
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.injury).toBe(19)
			})
		})
	})

	describe("B379: Wounding Modifiers and Injury. If there is any penetrating damage, multiply it by the attack’s “wounding modifier.”", () => {
		it("Small piercing (pi-): ×0.5.", () => {
			_roll.damageType = DamageType.pi_m
			_location.calc.dr.all = 5
			_target.hitLocationTable.locations.push(_location)

			_roll.basicDamage = 11
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.penetratingDamage).toBe(6)
			expect(calc.injury).toBe(3)
		})

		it("Burning (burn), corrosion (cor), crushing (cr), fatigue (fat), piercing (pi), and toxic (tox): ×1.", () => {
			let types = [DamageType.burn, DamageType.cor, DamageType.cr, DamageType.fat, DamageType.pi, DamageType.tox]
			for (const type of types) {
				_roll.damageType = type
				_location.calc.dr.all = 5
				_target.hitLocationTable.locations.push(_location)

				_roll.basicDamage = 11
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.penetratingDamage).toBe(6)
				expect(calc.injury).toBe(6)
			}
		})

		it("Cutting (cut) and large piercing (pi+): ×1.5.", () => {
			let types = [DamageType.cut, DamageType.pi_p]
			for (const type of types) {
				_roll.damageType = type
				_location.calc.dr.all = 5
				_target.hitLocationTable.locations.push(_location)

				_roll.basicDamage = 11
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.penetratingDamage).toBe(6)
				expect(calc.injury).toBe(9)
			}
		})

		it("Impaling (imp) and huge piercing (pi++): ×2.", () => {
			let types = [DamageType.imp, DamageType.pi_pp]
			for (const type of types) {
				_roll.damageType = type
				_location.calc.dr.all = 5
				_target.hitLocationTable.locations.push(_location)

				_roll.basicDamage = 11
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.penetratingDamage).toBe(6)
				expect(calc.injury).toBe(12)
			}
		})

		it("Round fractions down...", () => {
			_roll.damageType = DamageType.pi_m
			_location.calc.dr.all = 5
			_target.hitLocationTable.locations.push(_location)

			_roll.basicDamage = 12
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(3)
		})

		it("...but the minimum injury is 1 HP for any attack that penetrates DR at all.", () => {
			_roll.damageType = DamageType.pi_m
			_location.calc.dr.all = 11
			_target.hitLocationTable.locations.push(_location)

			_roll.basicDamage = 12
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(1)
		})
	})

	describe("B379: Flexible Armor and Blunt Trauma. An attack that does crushing, cutting, impaling, or piercing damage may inflict “blunt trauma” if it fails to penetrate flexible DR.", () => {
		it("For every full 10 points of cutting, impaling, or piercing damage ... stopped by your DR, you suffer 1 HP of injury due to blunt trauma.", () => {
			_location.calc.flexible = true
			_target.hitLocationTable.locations.push(_location)

			_location.calc.dr.all = 20

			for (let type of [DamageType.cut, DamageType.imp, ...AnyPiercingType]) {
				_roll.damageType = type

				_roll.basicDamage = 9
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.injury).toBe(0)
				expect(calc.bluntTrauma).toBe(0)

				_roll.basicDamage = 10
				calc = new DamageCalculator(_roll, _target)
				expect(calc.injury).toBe(0)
				expect(calc.bluntTrauma).toBe(1)

				_roll.basicDamage = 19
				calc = new DamageCalculator(_roll, _target)
				expect(calc.injury).toBe(0)
				expect(calc.bluntTrauma).toBe(1)

				_roll.basicDamage = 20
				calc = new DamageCalculator(_roll, _target)
				expect(calc.injury).toBe(0)
				expect(calc.bluntTrauma).toBe(2)
			}
		})

		it("For every full ... 5 points of crushing damage stopped by your DR, you suffer 1 HP of injury due to blunt trauma.", () => {
			_location.calc.flexible = true
			_target.hitLocationTable.locations.push(_location)
			_location.calc.dr.all = 20
			_roll.damageType = DamageType.cr

			_roll.basicDamage = 4
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(0)
			expect(calc.bluntTrauma).toBe(0)

			_roll.basicDamage = 5
			calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(0)
			expect(calc.bluntTrauma).toBe(1)

			_roll.basicDamage = 19
			calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(0)
			expect(calc.bluntTrauma).toBe(3)

			_roll.basicDamage = 20
			calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(0)
			expect(calc.bluntTrauma).toBe(4)
		})

		it("If even one point of damage penetrates your flexible DR, however, you do not suffer blunt trauma.", () => {
			_location.calc.flexible = true
			_target.hitLocationTable.locations.push(_location)
			_location.calc.dr.all = 20

			_roll.damageType = DamageType.cr
			_roll.basicDamage = 21
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(1)
			expect(calc.bluntTrauma).toBe(0)

			_roll.damageType = DamageType.pi_m
			_roll.basicDamage = 21
			calc = new DamageCalculator(_roll, _target)
			expect(calc.injury).toBe(1)
			expect(calc.bluntTrauma).toBe(0)
		})

		it("(Injury, Burning, Corrosive, Fatigue, Toxic, and Knockback don't do blunt trauma.)", () => {
			_location.calc.flexible = true
			_location.calc.dr.all = 20
			_target.hitLocationTable.locations.push(_location)

			for (let type of [
				DamageType.injury,
				DamageType.burn,
				DamageType.cor,
				DamageType.fat,
				DamageType.tox,
				DamageType.kb,
			]) {
				_roll.damageType = type
				_roll.basicDamage = 20
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.bluntTrauma).toBe(0)
			}
		})
	})

	describe("B381: Shock: Any injury that causes a loss of HP also causes “shock.”", () => {
		beforeEach(() => {
			_location.calc.dr.all = 2
			_target.hitLocationTable.locations.push(_location)
		})

		type DamageShock = { damage: number; shock: number }

		let verify: any = function (hp: number, noShockValues: number[], shockValues: DamageShock[]) {
			_target.hitPoints.value = hp

			for (const damage of noShockValues) {
				_roll.basicDamage = damage
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.injuryEffects).not.toContainEqual(expect.objectContaining({ name: "Shock" }))
			}

			for (let entry of shockValues) {
				_roll.basicDamage = entry.damage
				let calc = new DamageCalculator(_roll, _target)

				const injuryEffects = calc.injuryEffects
				expect(injuryEffects).toContainEqual(
					expect.objectContaining({
						id: InjuryEffectType.shock,
					})
				)

				let modifiers = calc.injuryEffects.find(it => it.id === InjuryEffectType.shock)?.modifiers
				expect(modifiers).toContainEqual(
					expect.objectContaining({
						id: "dx",
						rollType: RollType.Attribute,
						modifier: entry.shock,
					})
				)
				expect(modifiers).toContainEqual(
					expect.objectContaining({
						id: "iq",
						rollType: RollType.Attribute,
						modifier: entry.shock,
					})
				)
			}
		}

		// eslint-disable-next-line jest/expect-expect
		it("This is -1 per HP lost...", () => {
			let hp = 19
			let noShockValues = [1, 2]
			let shockValues = [
				{ damage: 3, shock: -1 },
				{ damage: 4, shock: -2 },
				{ damage: 5, shock: -3 },
				{ damage: 6, shock: -4 },
			]
			verify(hp, noShockValues, shockValues)
		})

		// eslint-disable-next-line jest/expect-expect
		it("...unless you have 20 or more HP, in which case it is -1 per (HP/10) lost, rounded down.", () => {
			for (let hp of [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]) {
				let noShockValues = [1, 2, 3]
				let shockValues = [
					{ damage: 4, shock: -1 },
					{ damage: 5, shock: -1 },
					{ damage: 6, shock: -2 },
					{ damage: 7, shock: -2 },
					{ damage: 8, shock: -3 },
					{ damage: 9, shock: -3 },
					{ damage: 10, shock: -4 },
					{ damage: 11, shock: -4 },
				]

				verify(hp, noShockValues, shockValues)
			}

			for (let hp of [30, 31, 32, 33, 34, 35, 36, 37, 38, 39]) {
				let noShockValues = [1, 2, 3, 4]
				let shockValues = [
					{ damage: 5, shock: -1 },
					{ damage: 6, shock: -1 },
					{ damage: 7, shock: -1 },
					{ damage: 8, shock: -2 },
					{ damage: 9, shock: -2 },
					{ damage: 10, shock: -2 },
					{ damage: 11, shock: -3 },
					{ damage: 12, shock: -3 },
					{ damage: 13, shock: -3 },
					{ damage: 14, shock: -4 },
					{ damage: 15, shock: -4 },
					{ damage: 16, shock: -4 },
				]

				verify(hp, noShockValues, shockValues)
			}
		})

		// eslint-disable-next-line jest/expect-expect
		it("The shock penalty cannot exceed -4, no matter how much injury you suffer.", () => {
			let hp = 12
			let noShockValues: never[] = [] // We're not testing this here.
			let shockValues = [
				{ damage: 7, shock: -4 },
				{ damage: 17, shock: -4 },
				{ damage: 57, shock: -4 },
			]

			verify(hp, noShockValues, shockValues)
		})
	})

	describe("B381: Major Wounds.", () => {
		it("Any single injury that inflicts a wound in excess of 1/2 your HP is a major wound.", () => {
			_target.hitPoints.value = 12
			_roll.locationId = "dummy"

			_roll.basicDamage = 6
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.injuryEffects).not.toContainEqual(expect.objectContaining({ id: "majorWound" }))

			_roll.basicDamage = 7
			calc = new DamageCalculator(_roll, _target)
			expect(calc.injuryEffects).toContainEqual(expect.objectContaining({ id: "majorWound" }))
			let wound = calc.injuryEffects.find(it => it.id === "majorWound")
			expect(wound?.modifiers.length).toBe(0)
		})

		it("For a major wound to the torso, you must make a HT roll. Failure means you’re stunned and knocked down; failure by 5+ means you pass out.", () => {
			_target.hitPoints.value = 12
			_roll.locationId = "torso"
			_roll.basicDamage = 7

			const calc = new DamageCalculator(_roll, _target)

			let checks = calc.injuryEffects.find(it => it.id === "majorWound")?.checks
			expect(checks).toContainEqual(
				expect.objectContaining({
					checks: [{ id: "ht", modifier: 0, rollType: RollType.Attribute }],
					failures: [
						{ id: "stun", margin: 0 },
						{ id: "fall prone", margin: 0 },
						{ id: "unconscious", margin: 5 },
					],
				})
			)
		})
	})

	describe("B378: Knockback. Knockback depends on basic damage rolled before subtracting DR.", () => {
		beforeEach(() => {
			_target.ST = 12
		})

		it("Only crushing and cutting (and knockback only) attacks can cause knockback.", () => {
			_location.calc.dr.all = 16
			_target.hitLocationTable.locations.push(_location)
			_target.ST = 10
			_roll.basicDamage = 16

			const testKeys = Object.keys(DamageType).filter(k => !["cr", "cut", "kb"].includes(k))
			for (let type of testKeys as (keyof typeof DamageType)[]) {
				_roll.damageType = DamageType[type]

				let calc = new DamageCalculator(_roll, _target)
				expect(calc.knockback).toBe(0)
			}
		})

		it("A crushing (or knockback only) attack can cause knockback regardless of whether it penetrates DR.", () => {
			expect(_roll.damageType).toBe(DamageType.cr)

			_roll.basicDamage = 9
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(0)

			_roll.basicDamage = 10
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(1)

			_roll.basicDamage = 19
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(1)

			_roll.basicDamage = 20
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(2)

			_roll.damageType = DamageType.kb

			_roll.basicDamage = 9
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(0)

			_roll.basicDamage = 10
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(1)

			_roll.basicDamage = 19
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(1)

			_roll.basicDamage = 20
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(2)
		})

		it("A cutting attack can cause knockback only if it fails to penetrate DR.", () => {
			_roll.damageType = DamageType.cut
			_location.calc.dr.all = 15
			_target.hitLocationTable.locations.push(_location)

			_roll.basicDamage = 9
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(0)

			_roll.basicDamage = 15
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(1)

			_roll.basicDamage = 16
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(0)
		})

		it("For every full multiple of the target’s ST-2 rolled, move the target one yard away from the attacker.", () => {
			_roll.damageType = DamageType.cr

			_roll.basicDamage = 9
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(0)

			_roll.basicDamage = 10
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(1)

			_roll.basicDamage = 19
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(1)

			_roll.basicDamage = 20
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(2)
		})

		it("Anyone who suffers knockback must attempt a roll against the highest of DX, Acrobatics, or Judo. On a failure, he falls down.", () => {
			expect(_roll.damageType).toBe(DamageType.cr)

			_roll.basicDamage = 10
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(1)

			const injuryEffects = calc.injuryEffects
			expect(injuryEffects).toContainEqual(
				expect.objectContaining({
					id: "knockback",
				})
			)

			let checks = calc.injuryEffects.find(it => it.id === "knockback")?.checks
			expect(checks).toContainEqual(
				expect.objectContaining({
					checks: [
						{ id: "dx", rollType: RollType.Attribute, modifier: 0 },
						{ id: "Acrobatics", rollType: RollType.Skill, modifier: 0 },
						{ id: "Judo", rollType: RollType.Skill, modifier: 0 },
					],
					failures: [{ id: "fall prone", margin: 0 }],
				})
			)
		})

		it("... at -1 per yard after the first.", () => {
			expect(_roll.damageType).toBe(DamageType.cr)

			_roll.basicDamage = 20
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(2)

			const injuryEffects = calc.injuryEffects
			expect(injuryEffects).toContainEqual(
				expect.objectContaining({
					id: "knockback",
				})
			)

			let checks = calc.injuryEffects.find(it => it.id === "knockback")?.checks
			expect(checks).toContainEqual(
				expect.objectContaining({
					checks: [
						{ id: "dx", rollType: RollType.Attribute, modifier: -1 },
						{ id: "Acrobatics", rollType: RollType.Skill, modifier: -1 },
						{ id: "Judo", rollType: RollType.Skill, modifier: -1 },
					],
					failures: [{ id: "fall prone", margin: 0 }],
				})
			)

			_roll.basicDamage = 50
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(5)

			checks = calc.injuryEffects.find(it => it.id === "knockback")?.checks
			expect(checks).toContainEqual(
				expect.objectContaining({
					checks: [
						{ id: "dx", rollType: RollType.Attribute, modifier: -4 },
						{ id: "Acrobatics", rollType: RollType.Skill, modifier: -4 },
						{ id: "Judo", rollType: RollType.Skill, modifier: -4 },
					],
					failures: [{ id: "fall prone", margin: 0 }],
				})
			)
		})

		it("... Perfect Balance gives +4 to this roll.", () => {
			expect(_roll.damageType).toBe(DamageType.cr)

			_target._traits.push("Perfect Balance")
			_roll.basicDamage = 10
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(1)

			const injuryEffects = calc.injuryEffects
			expect(injuryEffects).toContainEqual(
				expect.objectContaining({
					id: "knockback",
				})
			)

			let checks = calc.injuryEffects.find(it => it.id === "knockback")?.checks
			expect(checks).toContainEqual(
				expect.objectContaining({
					checks: [
						{ id: "dx", rollType: RollType.Attribute, modifier: 4 },
						{ id: "Acrobatics", rollType: RollType.Skill, modifier: 4 },
						{ id: "Judo", rollType: RollType.Skill, modifier: 4 },
					],
					failures: [{ id: "fall prone", margin: 0 }],
				})
			)

			_roll.basicDamage = 30
			calc = new DamageCalculator(_roll, _target)
			expect(calc.knockback).toBe(3)

			checks = calc.injuryEffects.find(it => it.id === "knockback")?.checks
			expect(checks).toContainEqual(
				expect.objectContaining({
					checks: [
						{ id: "dx", rollType: RollType.Attribute, modifier: 2 },
						{ id: "Acrobatics", rollType: RollType.Skill, modifier: 2 },
						{ id: "Judo", rollType: RollType.Skill, modifier: 2 },
					],
					failures: [{ id: "fall prone", margin: 0 }],
				})
			)
		})
	})

	describe("B380: Injury to Unliving, Homogenous, and Diffuse Targets.", () => {
		describe("Unliving.", () => {
			beforeEach(() => {
				_location.calc.dr.all = 5
				_target.hitLocationTable.locations.push(_location)
				_target.isUnliving = true
			})

			it("This gives impaling and huge piercing a wounding modifier of ×1; ...", () => {
				let types = [DamageType.imp, DamageType.pi_pp]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 11
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(6)
					expect(calc.injury).toBe(6)
				}
			})

			it("... large piercing, ×1/2;", () => {
				let types = [DamageType.pi_p]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 11
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(6)
					expect(calc.injury).toBe(6)
				}
			})

			it("... piercing, ×1/3;", () => {
				let types = [DamageType.pi]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 11
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(6)
					expect(calc.injury).toBe(2)
				}
			})

			it("... and small piercing, ×1/5.", () => {
				let types = [DamageType.pi_m]
				for (const type of types) {
					_roll.damageType = type
					_roll.damageType = type
					_roll.basicDamage = 15
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(10)
					expect(calc.injury).toBe(2)
				}
			})
		})

		describe("Homogenous.", () => {
			beforeEach(() => {
				_location.calc.dr.all = 5
				_target.hitLocationTable.locations.push(_location)
				_target.isHomogenous = true
			})

			it("This gives impaling and huge piercing a wounding modifier of ×1/2; ...", () => {
				let types = [DamageType.imp, DamageType.pi_pp]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 11
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(6)
					expect(calc.injury).toBe(3)
				}
			})

			it("... large piercing, ×1/3;", () => {
				let types = [DamageType.pi_p]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 11
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(6)
					expect(calc.injury).toBe(2)
				}
			})

			it("... piercing, ×1/5;", () => {
				let types = [DamageType.pi]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 15
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(10)
					expect(calc.injury).toBe(2)
				}
			})

			it("... and small piercing, ×1/10.", () => {
				let types = [DamageType.pi_m]
				for (const type of types) {
					_roll.damageType = type
					_roll.damageType = type
					_roll.basicDamage = 15
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(10)
					expect(calc.injury).toBe(1)
				}
			})
		})

		describe("Diffuse.", () => {
			beforeEach(() => {
				_location.calc.dr.all = 5
				_target.hitLocationTable.locations.push(_location)
				_target.isDiffuse = true
				_roll.basicDamage = 100
			})

			it("Impaling and piercing attacks (of any size) never do more than 1 HP of injury.", () => {
				let types = [DamageType.imp, DamageType.pi_pp, DamageType.pi_p, DamageType.pi, DamageType.pi_m]
				for (const type of types) {
					_roll.damageType = type
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(95)
					expect(calc.injury).toBe(1)
				}
			})

			it("Other attacks can never do more than 2 HP of injury.", () => {
				let types = [
					DamageType.burn,
					DamageType.cor,
					DamageType.cr,
					DamageType.cut,
					DamageType.fat,
					DamageType.injury,
					DamageType.tox,
				]
				for (const type of types) {
					_roll.damageType = type
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.injury).toBe(2)
				}
			})
		})
	})

	describe("B398: Hit Location", () => {
		beforeEach(() => {
			let _vitals = {
				calc: {
					dr: { all: 5 },
					roll_range: "-",
					flexible: false,
				},
				choice_name: "Vitals",
				description: "",
				dr_bonus: 0,
				table_name: "Vitals",
				hit_penalty: -3,
				id: "vitals",
				slots: 0,
			}

			let _skull = {
				calc: {
					dr: { all: 5 },
					roll_range: "3-4",
					flexible: false,
				},
				choice_name: "Skull",
				description: "",
				dr_bonus: 2,
				table_name: "Skull",
				hit_penalty: -7,
				id: "skull",
				slots: 0,
			}

			let _eye = {
				calc: {
					dr: { all: 5 },
					roll_range: "-",
					flexible: false,
				},
				choice_name: "Eye",
				description: "",
				dr_bonus: 0,
				table_name: "Eye",
				hit_penalty: -9,
				id: "eye",
				slots: 0,
			}

			let _face = {
				calc: {
					dr: { all: 0 },
					roll_range: "5",
					flexible: false,
				},
				choice_name: "Face",
				description: "",
				dr_bonus: 0,
				table_name: "Face",
				hit_penalty: -5,
				id: "face",
				slots: 1,
			}

			_target.hitLocationTable.locations.push(_vitals)
			_target.hitLocationTable.locations.push(_skull)
			_target.hitLocationTable.locations.push(_eye)
			_target.hitLocationTable.locations.push(_face)
			_roll.basicDamage = 11
		})

		describe("Vitals.", () => {
			beforeEach(() => {
				_roll.locationId = "vitals"
			})

			it("Increase the wounding modifier for an impaling or any piercing attack to ×3.", () => {
				let types = [DamageType.imp, ...AnyPiercingType]
				for (const type of types) {
					_roll.damageType = type
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(6)
					expect(calc.injury).toBe(18)
				}
			})

			it("Increase the wounding modifier for a tight-beam burning attack ... to ×2.", () => {
				_roll.damageType = DamageType.burn
				_roll.damageModifier = "tbb"
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.penetratingDamage).toBe(6)
				expect(calc.injury).toBe(12)
			})

			it("B420: whenever you are struck in the ... vitals for enough injury to cause a shock penalty, you must make an immediate HT roll to avoid knockdown.", () => {
				_roll.basicDamage = 6
				_roll.damageType = DamageType.cr
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.penetratingDamage).toBe(1)
				expect(calc.injury).toBe(1)

				expect(calc.injuryEffects).toContainEqual(expect.objectContaining({ id: InjuryEffectType.shock }))

				let checks = calc.injuryEffects.find(it => it.id === InjuryEffectType.majorWound)?.checks
				expect(checks).toContainEqual(
					expect.objectContaining({
						checks: [{ id: "ht", modifier: -5, rollType: RollType.Attribute }],
						failures: [
							{ id: "stun", margin: 0 },
							{ id: "fall prone", margin: 0 },
							{ id: "unconscious", margin: 5 },
						],
					})
				)
			})
		})

		describe("Skull or Eye. (For eye, treat as a skull hit without the extra DR 2!)", () => {
			it("The wounding modifier for all attacks increases to ×4.", () => {
				for (const location of ["skull", "eye"]) {
					_roll.locationId = location

					let types = [
						DamageType.imp,
						...AnyPiercingType,
						DamageType.burn,
						DamageType.cor,
						DamageType.cr,
						DamageType.cut,
					]
					for (const type of types) {
						_roll.damageType = type
						let calc = new DamageCalculator(_roll, _target)
						expect(calc.penetratingDamage).toBe(6)
						expect(calc.injury).toBe(24)
					}
				}
			})

			it("Knockdown (stun) rolls are at -10.", () => {
				for (const location of ["skull", "eye"]) {
					_roll.locationId = location

					let types = [
						DamageType.imp,
						...AnyPiercingType,
						DamageType.burn,
						DamageType.cor,
						DamageType.cr,
						DamageType.cut,
					]
					for (const type of types) {
						_roll.damageType = type
						let calc = new DamageCalculator(_roll, _target)
						expect(calc.penetratingDamage).toBe(6)
						expect(calc.injury).toBe(24)

						let checks = calc.injuryEffects.find(it => it.id === "majorWound")?.checks
						expect(checks).toContainEqual(
							expect.objectContaining({
								checks: [{ id: "ht", modifier: -10, rollType: RollType.Attribute }],
								failures: [
									{ id: "stun", margin: 0 },
									{ id: "fall prone", margin: 0 },
									{ id: "unconscious", margin: 5 },
								],
							})
						)
					}
				}
			})

			it("B420: whenever you are struck in the head ... for enough injury to cause a shock penalty, you must make an immediate HT roll to avoid knockdown.", () => {
				for (const location of ["skull", "eye"]) {
					_roll.locationId = location

					_roll.basicDamage = 6
					_roll.damageType = DamageType.cr
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(1)
					expect(calc.injury).toBe(4)

					expect(calc.injuryEffects).toContainEqual(expect.objectContaining({ id: "shock" }))

					let checks = calc.injuryEffects.find(it => it.id === "majorWound")?.checks
					expect(checks).toContainEqual(
						expect.objectContaining({
							checks: [{ id: "ht", modifier: -10, rollType: RollType.Attribute }],
							failures: [
								{ id: "stun", margin: 0 },
								{ id: "fall prone", margin: 0 },
								{ id: "unconscious", margin: 5 },
							],
						})
					)
				}
			})

			it("None of these effects apply to toxic damage.", () => {
				for (const location of ["skull", "eye"]) {
					_roll.locationId = location

					_roll.basicDamage = 13
					_roll.damageType = DamageType.tox
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(8)
					expect(calc.injury).toBe(8)

					expect(calc.injuryEffects).toContainEqual(expect.objectContaining({ id: "majorWound" }))
				}
			})

			it("Fatigue damage always ignores hit location.", () => {
				for (const location of ["skull", "eye"]) {
					_roll.locationId = location

					_roll.damageType = DamageType.fat
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(6)
					expect(calc.injury).toBe(6)
				}
			})

			it("Injury over HP/10 blinds the eye.", () => {
				_target.hitPoints.value = 50
				_roll.locationId = "eye"

				_roll.basicDamage = 6
				_roll.damageType = DamageType.cr
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.penetratingDamage).toBe(1)
				expect(calc.injury).toBe(4)

				expect(calc.injuryEffects).not.toContainEqual(expect.objectContaining({ id: "eye blinded" }))

				_roll.basicDamage = 7
				_roll.damageType = DamageType.cr
				calc = new DamageCalculator(_roll, _target)
				expect(calc.penetratingDamage).toBe(2)
				expect(calc.injury).toBe(8)

				expect(calc.injuryEffects).toContainEqual(expect.objectContaining({ id: InjuryEffectType.eyeBlinded }))
			})
		})

		describe("Face.", () => {
			beforeEach(() => {
				_roll.locationId = "face"
			})

			it("Corrosion damage (only) gets a ×1.5 wounding modifier.", () => {
				_roll.damageType = DamageType.cor
				_roll.basicDamage = 10
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.penetratingDamage).toBe(10)
				expect(calc.injury).toBe(15)

				let types = [DamageType.imp, ...AnyPiercingType, DamageType.burn, DamageType.cr, DamageType.cut]
				for (const type of types) {
					_roll.damageType = type
					let calc = new DamageCalculator(_roll, _target)
					expect(calc.penetratingDamage).toBe(10)
					expect(calc.injury).toBe(10)
				}
			})

			it("Knockdown (stun) rolls are at -5.", () => {
				let calc = new DamageCalculator(_roll, _target)

				let checks = calc.injuryEffects.find(it => it.id === "majorWound")?.checks
				expect(checks).toContainEqual(
					expect.objectContaining({
						checks: [{ id: "ht", modifier: -5, rollType: RollType.Attribute }],
						failures: [
							{ id: "stun", margin: 0 },
							{ id: "fall prone", margin: 0 },
							{ id: "unconscious", margin: 5 },
						],
					})
				)
			})

			it("If (cor) inflicts a major wound, it also blinds one eye.", () => {
				_roll.locationId = "face"
				_roll.basicDamage = 8
				_roll.damageType = DamageType.cor
				let calc = new DamageCalculator(_roll, _target)

				expect(calc.injury).toBeGreaterThan(_target.hitPoints.value / 2)
				expect(calc.injury).toBeLessThan(_target.hitPoints.value)
				expect(calc.injuryEffects).toContainEqual(expect.objectContaining({ id: InjuryEffectType.majorWound }))
				expect(calc.injuryEffects).toContainEqual(expect.objectContaining({ id: InjuryEffectType.eyeBlinded }))
			})

			it("...(both eyes on damage greater than full HP).", () => {
				_roll.locationId = "face"
				_roll.basicDamage = 15
				_roll.damageType = DamageType.cor
				let calc = new DamageCalculator(_roll, _target)

				expect(calc.injury).toBeGreaterThan(_target.hitPoints.value)
				expect(calc.injuryEffects).toContainEqual(expect.objectContaining({ id: InjuryEffectType.majorWound }))
				expect(calc.injuryEffects).toContainEqual(expect.objectContaining({ id: InjuryEffectType.blinded }))
			})
		})
	})
})
