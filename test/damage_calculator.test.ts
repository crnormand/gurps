/* eslint-disable jest/no-disabled-tests */
import { TraitGURPS } from "@item"
import {
	DamageAttacker,
	DamageCalculator,
	DamageRoll,
	DamageTarget,
	DamageType,
	HitLocationTableWithCalc,
	HitLocation,
} from "../src/module/damage_calculator"
import { DiceGURPS } from "../src/module/dice"

class _Attacker implements DamageAttacker {}

class _Target implements DamageTarget {
	hitPoints = { value: 15, current: 10 }

	traits: TraitGURPS[] = []

	hasTrait(name: string): boolean {
		throw new Error("Method not implemented.")
	}

	_dummy = {
		name: "humanoid",
		roll: "3d",
		// eslint-disable-next-line no-array-constructor
		locations: new Array<HitLocation>(),
	}

	get hitLocationTable(): HitLocationTableWithCalc {
		return this._dummy
	}
}

class _DamageRoll implements DamageRoll {
	locationId = "torso"

	attacker = new _Attacker()

	dice = new DiceGURPS("2d")

	basicDamage = 0

	damageType = DamageType.cr

	armorDivisor = 0
}

// Add real tests here.
describe("Damage calculator", () => {
	let _attacker: DamageAttacker
	let _target: DamageTarget
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
		_roll.armorDivisor = 0
		_roll.damageType = DamageType.cr
		_roll.dice = new DiceGURPS("2d")
		_roll.locationId = "torso"
	})

	it("calculator exists", () => {
		let calc: DamageCalculator = new DamageCalculator(_roll, _target)
		expect(calc).not.toBeNull()
	})

	describe("B378: Damage Roll", () => {
		it("The result of the damage roll ... is the hit’s “basic damage.”", () => {
			_roll.basicDamage = 8
			let calc = new DamageCalculator(_roll, _target)
			expect(calc.basicDamage).toBe(8)

			_roll.basicDamage = 4
			calc = new DamageCalculator(_roll, _target)
			expect(calc.basicDamage).toBe(4)
		})
	})

	describe("B378: Damage Resistance and Penetration - Subtract DR from basic damage. The result is the “penetrating damage”", () => {
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
	})

	describe("B378: Armor Divisors and Penetration Modifiers", () => {
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
		})

		describe("Some divisors are fractions, such as (0.5), (0.2), or (0.1). DR is increased against such attacks:", () => {
			it("... multiply DR by 2 for (0.5), ...", () => {
				_location.calc.dr.all = 5
				_target.hitLocationTable.locations.push(_location)
				_roll.basicDamage = 20

				_roll.armorDivisor = 0.5
				let calc = new DamageCalculator(_roll, _target)
				expect(calc.injury).toBe(10)
			})

			it("... by 5 for (0.2), ...", () => {
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
		})
	})

	describe("B379: Wounding Modifiers and Injury - If there is any penetrating damage, multiply it by the attack’s “wounding modifier.”", () => {
		it("Small piercing (pi-): ×0.5.", () => {
			_roll.damageType = DamageType.pi_m
			_location.calc.dr.all = 5
			_target.hitLocationTable.locations.push(_location)

			_roll.basicDamage = 11
			let calc = new DamageCalculator(_roll, _target)
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

	describe("B379: Flexible Armor and Blunt Trauma", () => {
		describe("An attack that does crushing, cutting, impaling, or piercing damage may inflict “blunt trauma” if it fails to penetrate flexible DR.", () => {
			it("For every full 10 points of cutting, impaling, or piercing damage ... stopped by your DR, you suffer 1 HP of injury due to blunt trauma.", () => {
				_location.calc.flexible = true
				_target.hitLocationTable.locations.push(_location)

				_location.calc.dr.all = 20

				for (let type of [
					DamageType.cut,
					DamageType.imp,
					DamageType.pi,
					DamageType.pi_m,
					DamageType.pi_p,
					DamageType.pi_pp,
				]) {
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
					expect(calc.injury).toBe(0)
					expect(calc.bluntTrauma).toBe(0)
				}
			})
		})
	})

	describe("B381: Shock: Any injury that causes a loss of HP also causes “shock.”", () => {
		it("This is -1 per HP lost...", () => {
			_location.calc.dr.all = 2
			_target.hitLocationTable.locations.push(_location)

			for (const damage of [1, 2]) {
				_roll.basicDamage = damage

				let calc = new DamageCalculator(_roll, _target)

				expect(calc.injuryEffects).toHaveLength(0)
			}

			for (const damage of [3, 4, 5, 6]) {
				_roll.basicDamage = damage

				let calc = new DamageCalculator(_roll, _target)

				expect(calc.injuryEffects).toHaveLength(1)
				let effect = calc.injuryEffects[0]
				expect(effect).toEqual(
					expect.objectContaining({
						modifier: 2 - damage,
						text: "Shock",
						traits: ["IQ", "DX"],
					})
				)
			}
		})

		it("...unless you have 20 or more HP, in which case it is -1 per (HP/10) lost, rounded down.", () => {
			_location.calc.dr.all = 2
			_target.hitLocationTable.locations.push(_location)
			_target.hitPoints.value = 20

			for (const damage of [1, 2]) {
				_roll.basicDamage = damage

				let calc = new DamageCalculator(_roll, _target)

				expect(calc.injuryEffects).toHaveLength(0)
			}

			for (const damage of [3, 4, 5, 6]) {
				_roll.basicDamage = damage

				let calc = new DamageCalculator(_roll, _target)

				expect(calc.injuryEffects).toHaveLength(1)
				let effect = calc.injuryEffects[0]
				expect(effect).toEqual(
					expect.objectContaining({
						modifier: 2 - damage,
						text: "Shock",
						traits: ["IQ", "DX"],
					})
				)
			}
		})
	})
})
