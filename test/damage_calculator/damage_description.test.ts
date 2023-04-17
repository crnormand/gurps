/* eslint-disable jest/no-disabled-tests */
import { DamageAttacker, DamageRoll, DamageTarget, TargetTrait, TargetTraitModifier } from "@module/damage_calculator"
import { Extremity, Head, Limb } from "@module/damage_calculator/damage_calculator"
import { DamageTypes } from "@module/damage_calculator/damage_type"
import { DiceGURPS } from "@module/dice"
import { DamageHitLocation, _Attacker, _DamageRoll, _Target, _create } from "./common"

// Add real tests here.
describe("Damage calculator", () => {
	let _attacker: DamageAttacker
	let _target: _Target
	let _roll: DamageRoll

	let _torso: DamageHitLocation
	let _vitals: DamageHitLocation
	let _skull: DamageHitLocation
	let _eye: DamageHitLocation
	let _face: DamageHitLocation
	let _neck: DamageHitLocation
	let _groin: DamageHitLocation
	let _arm: DamageHitLocation
	let _leg: DamageHitLocation
	let _hand: DamageHitLocation
	let _foot: DamageHitLocation
	const locations = ["groin", "vitals", "neck", ...Head, ...Limb, ...Extremity]

	beforeEach(() => {
		_attacker = new _Attacker()
		_target = new _Target()
		_roll = new _DamageRoll()
		_roll.attacker = _attacker
		_roll.basicDamage = 8
		_roll.armorDivisor = 1
		_roll.damageType = DamageTypes.cr
		_roll.dice = new DiceGURPS("2d")
		_roll.locationId = "torso"

		_torso = new DamageHitLocation(_target, _target.hitLocationTable, {
			choice_name: "Torso",
			description: "",
			dr_bonus: 0,
			table_name: "Torso",
			hit_penalty: 0,
			id: "torso",
			slots: 2,
		})

		_vitals = new DamageHitLocation(_target, _target.hitLocationTable, {
			choice_name: "Vitals",
			description: "",
			dr_bonus: 0,
			table_name: "Vitals",
			hit_penalty: -3,
			id: "vitals",
			slots: 0,
		})

		_skull = new DamageHitLocation(_target, _target.hitLocationTable, {
			choice_name: "Skull",
			description: "",
			dr_bonus: 2,
			table_name: "Skull",
			hit_penalty: -7,
			id: "skull",
			slots: 0,
		})

		_eye = new DamageHitLocation(_target, _target.hitLocationTable, {
			choice_name: "Eye",
			description: "",
			dr_bonus: 0,
			table_name: "Eye",
			hit_penalty: -9,
			id: "eye",
			slots: 0,
		})

		_face = new DamageHitLocation(_target, _target.hitLocationTable, {
			choice_name: "Face",
			description: "",
			dr_bonus: 0,
			table_name: "Face",
			hit_penalty: -5,
			id: "face",
			slots: 1,
		})

		_neck = new DamageHitLocation(_target, _target.hitLocationTable, {
			choice_name: "Face",
			description: "",
			dr_bonus: 0,
			table_name: "Face",
			hit_penalty: -5,
			id: "face",
			slots: 1,
		})

		_groin = new DamageHitLocation(_target, _target.hitLocationTable, {
			choice_name: "Face",
			description: "",
			dr_bonus: 0,
			table_name: "Face",
			hit_penalty: -5,
			id: "face",
			slots: 1,
		})

		_arm = new DamageHitLocation(_target, _target.hitLocationTable, {
			choice_name: "Right Arm",
			description: "",
			dr_bonus: 0,
			table_name: "Right Arm",
			hit_penalty: -2,
			id: "arm",
			slots: 1,
		})

		_leg = new DamageHitLocation(_target, _target.hitLocationTable, {
			choice_name: "Right Leg",
			description: "",
			dr_bonus: 0,
			table_name: "Right Leg",
			hit_penalty: -2,
			id: "leg",
			slots: 2,
		})

		_hand = new DamageHitLocation(_target, _target.hitLocationTable, {
			choice_name: "Hand",
			description: "",
			dr_bonus: 0,
			table_name: "Hand",
			hit_penalty: -4,
			id: "hand",
			slots: 1,
		})

		_foot = new DamageHitLocation(_target, _target.hitLocationTable, {
			choice_name: "Foot",
			description: "",
			dr_bonus: 0,
			table_name: "Foot",
			hit_penalty: -4,
			id: "foot",
			slots: 1,
		})

		_target.hitLocationTable.locations.push(_torso)
		_target.hitLocationTable.locations.push(_vitals)
		_target.hitLocationTable.locations.push(_skull)
		_target.hitLocationTable.locations.push(_eye)
		_target.hitLocationTable.locations.push(_face)
		_target.hitLocationTable.locations.push(_neck)
		_target.hitLocationTable.locations.push(_groin)
		_target.hitLocationTable.locations.push(_arm)
		_target.hitLocationTable.locations.push(_leg)
		_target.hitLocationTable.locations.push(_hand)
		_target.hitLocationTable.locations.push(_foot)
		_roll.basicDamage = 10
	})

	describe("B378: Damage Roll.", () => {
		it("The result of the damage roll is the hit’s “basic damage.”", () => {
			_roll.basicDamage = 8
			let calc = _create(_roll, _target)
			expect(calc.description).toEqual([
				{ step: "Basic Damage", value: "8", notes: "HP" },
				{ step: "DR", value: "0", notes: "Torso" },
				{ step: "Penetrating", value: "8", notes: "= 8 – 0" },
				{ step: "Modifier", value: "×1", notes: "gurps.damage.type.cr" },
				{ step: "Injury", value: "8", notes: "= 8 × 1" },
			])
		})

		it.skip("(Knockback Only does no damage.)", () => {
			_roll.basicDamage = 8
			_roll.damageType = DamageTypes.kb
			let calc = _create(_roll, _target)
			expect(calc.description).toEqual([
				{ step: "Basic Damage", value: "8", notes: "HP" },
				{ step: "DR", value: "0", notes: "Knockback only" },
				{ step: "Penetrating", value: "8", notes: "= 8 – 0" },
				{ step: "Modifier", value: "×1", notes: "gurps.damage.type.cr" },
				{ step: "Injury", value: "0", notes: "Knockback only" },
			])
		})
	})

	describe("B378: Damage Resistance and Penetration. Subtract DR from basic damage. The result is the “penetrating damage”", () => {
		it("If your target has any Damage Resistance (DR) he subtracts this from your damage roll.", () => {
			_roll.basicDamage = 8
			_torso._map.set("all", 2)

			let calc = _create(_roll, _target)
			expect(calc.description).toEqual([
				{ step: "Basic Damage", value: "8", notes: "HP" },
				{ step: "DR", value: "2", notes: "Torso" },
				{ step: "Penetrating", value: "6", notes: "= 8 – 2" },
				{ step: "Modifier", value: "×1", notes: "gurps.damage.type.cr" },
				{ step: "Injury", value: "6", notes: "= 6 × 1" },
			])
		})

		it("If your damage roll is less than or equal to your target’s effective DR, your attack failed to penetrate.", () => {
			_roll.basicDamage = 5
			_torso._map.set("all", 9)

			let calc = _create(_roll, _target)
			expect(calc.description).toEqual([
				{ step: "Basic Damage", value: "5", notes: "HP" },
				{ step: "DR", value: "9", notes: "Torso" },
				{ step: "Penetrating", value: "0", notes: "= 5 – 9" },
				{ step: "Modifier", value: "×1", notes: "gurps.damage.type.cr" },
				{ step: "Injury", value: "0", notes: "= 0 × 1" },
			])
		})

		it("(Direct Injury ignores DR.)", () => {
			_roll.damageType = DamageTypes.injury
			_torso._map.set("all", 9)

			_roll.basicDamage = 8
			let calc = _create(_roll, _target)
			expect(calc.description).toEqual([
				{ step: "Basic Damage", value: "8", notes: "HP" },
				{ step: "DR", value: "9", notes: "Torso" },
				{ step: "Effective DR", value: "0", notes: "Ignores DR" },
				{ step: "Penetrating", value: "8", notes: "= 8 – 0" },
				{ step: "Modifier", value: "×1", notes: "gurps.damage.type.injury" },
				{ step: "Injury", value: "8", notes: "= 8 × 1" },
			])
		})
	})

	describe("B378: Armor Divisors and Penetration Modifiers.", () => {
		beforeEach(() => {
			_roll.basicDamage = 20
		})

		describe("A divisor of (2) or more means that DR protects at reduced value against the attack.", () => {
			it("Divide the target’s DR by the number in parentheses before subtracting it from basic damage; e.g., (2) means DR protects at half value.", () => {
				_torso._map.set("all", 20)
				_roll.armorDivisor = 2
				let calc = _create(_roll, _target)
				expect(calc.description).toEqual([
					{ step: "Basic Damage", value: "20", notes: "HP" },
					{ step: "DR", value: "20", notes: "Torso" },
					{ step: "Effective DR", value: "10", notes: "Armor Divisor (2)" },
					{ step: "Penetrating", value: "10", notes: "= 20 – 10" },
					{ step: "Modifier", value: "×1", notes: "gurps.damage.type.cr" },
					{ step: "Injury", value: "10", notes: "= 10 × 1" },
				])
			})

			it("(Ignores DR.)", () => {
				_torso._map.set("all", 20)
				_roll.armorDivisor = 0
				let calc = _create(_roll, _target)
				expect(calc.description).toEqual([
					{ step: "Basic Damage", value: "20", notes: "HP" },
					{ step: "DR", value: "20", notes: "Torso" },
					{ step: "Effective DR", value: "0", notes: "Ignores DR" },
					{ step: "Penetrating", value: "20", notes: "= 20 – 0" },
					{ step: "Modifier", value: "×1", notes: "gurps.damage.type.cr" },
					{ step: "Injury", value: "20", notes: "= 20 × 1" },
				])
			})
		})

		describe("Some divisors are fractions, such as (0.5), (0.2), or (0.1). DR is increased against such attacks:", () => {
			it("... multiply DR by 2 for (0.5),", () => {
				_torso._map.set("all", 5)

				_roll.armorDivisor = 0.5
				let calc = _create(_roll, _target)
				expect(calc.description).toEqual([
					{ step: "Basic Damage", value: "20", notes: "HP" },
					{ step: "DR", value: "5", notes: "Torso" },
					{ step: "Effective DR", value: "10", notes: "Armor Divisor (0.5)" },
					{ step: "Penetrating", value: "10", notes: "= 20 – 10" },
					{ step: "Modifier", value: "×1", notes: "gurps.damage.type.cr" },
					{ step: "Injury", value: "10", notes: "= 10 × 1" },
				])
				expect(calc.injury).toBe(10)
			})

			it("In addition, if you have any level of this limitation, targets that have DR 0 get DR 1 against your attack.", () => {
				_torso._map.set("all", 0)
				_roll.armorDivisor = 0.5
				let calc = _create(_roll, _target)
				expect(calc.description).toEqual([
					{ step: "Basic Damage", value: "20", notes: "HP" },
					{ step: "DR", value: "0", notes: "Torso" },
					{ step: "Effective DR", value: "1", notes: "Armor Divisor (0.5)" },
					{ step: "Penetrating", value: "19", notes: "= 20 – 1" },
					{ step: "Modifier", value: "×1", notes: "gurps.damage.type.cr" },
					{ step: "Injury", value: "19", notes: "= 19 × 1" },
				])
			})
		})
	})

	describe("B379: Wounding Modifiers and Injury. If there is any penetrating damage, multiply it by the attack’s “wounding modifier.”", () => {
		beforeEach(() => {
			_torso._map.set("all", 5)
			_roll.basicDamage = 11
		})

		it("Small piercing (pi-): ×0.5.", () => {
			_roll.damageType = DamageTypes["pi-"]
			let calc = _create(_roll, _target)
			expect(calc.description).toEqual([
				{ step: "Basic Damage", value: "11", notes: "HP" },
				{ step: "DR", value: "5", notes: "Torso" },
				{ step: "Penetrating", value: "6", notes: "= 11 – 5" },
				{ step: "Modifier", value: "×0.5", notes: "gurps.damage.type.pi-" },
				{ step: "Injury", value: "3", notes: "= 6 × 0.5" },
			])
		})
	})

	describe("B379: Flexible Armor and Blunt Trauma. An attack that does crushing, cutting, impaling, or piercing damage may inflict “blunt trauma” if it fails to penetrate flexible DR.", () => {
		beforeEach(() => {
			_torso._map.set("all", 20)
		})

		it("For every full 10 points of cutting, impaling, or piercing damage stopped by your DR, you suffer 1 HP of injury due to blunt trauma.", () => {
			_roll.damageType = DamageTypes.cut
			_roll.basicDamage = 9
			let calc = _create(_roll, _target)
			calc.overrideFlexible(true)
			expect(calc.description).toEqual([
				{ step: "Basic Damage", value: "9", notes: "HP" },
				{ step: "DR", value: "20", notes: "Torso" },
				{ step: "Penetrating", value: "0", notes: "= 9 – 20" },
				{ step: "Modifier", value: "×1.5", notes: "gurps.damage.type.cut" },
				{ step: "Injury", value: "0", notes: "= 0 × 1.5" },
			])

			_roll.basicDamage = 10
			calc = _create(_roll, _target)
			calc.overrideFlexible(true)
			expect(calc.description).toEqual([
				{ step: "Basic Damage", value: "10", notes: "HP" },
				{ step: "DR", value: "20", notes: "Torso" },
				{ step: "Penetrating", value: "0", notes: "= 10 – 20" },
				{ step: "Modifier", value: "×1.5", notes: "gurps.damage.type.cut" },
				{ step: "Injury", value: "1", notes: "Blunt Trauma" },
			])

			_roll.basicDamage = 20
			calc = _create(_roll, _target)
			calc.overrideFlexible(true)
			expect(calc.description).toEqual([
				{ step: "Basic Damage", value: "20", notes: "HP" },
				{ step: "DR", value: "20", notes: "Torso" },
				{ step: "Penetrating", value: "0", notes: "= 20 – 20" },
				{ step: "Modifier", value: "×1.5", notes: "gurps.damage.type.cut" },
				{ step: "Injury", value: "2", notes: "Blunt Trauma" },
			])
		})

		it("If even one point of damage penetrates your flexible DR, however, you do not suffer blunt trauma.", () => {
			_roll.damageType = DamageTypes["pi-"]
			_roll.basicDamage = 21
			let calc = _create(_roll, _target)
			calc.overrideFlexible(true)
			expect(calc.description).toEqual([
				{ step: "Basic Damage", value: "21", notes: "HP" },
				{ step: "DR", value: "20", notes: "Torso" },
				{ step: "Penetrating", value: "1", notes: "= 21 – 20" },
				{ step: "Modifier", value: "×0.5", notes: "gurps.damage.type.pi-" },
				{ step: "Injury", value: "1", notes: "= 1 × 0.5" },
			])
		})
	})

	describe("B380: Injury to Unliving, Homogenous, and Diffuse Targets.", () => {
		describe("Unliving.", () => {
			beforeEach(() => {
				_torso._map.set("all", 5)
				_target.isUnliving = true
			})

			it.skip("This gives impaling and huge piercing a wounding modifier of ×1; ...", () => {
				_roll.damageType = DamageTypes.imp
				_roll.basicDamage = 11
				let calc = _create(_roll, _target)
				expect(calc.penetratingDamage).toBe(6)
				expect(calc.injury).toBe(6)
				expect(calc.description).toEqual([
					{ step: "Basic Damage", value: "11", notes: "HP" },
					{ step: "DR", value: "5", notes: "Torso" },
					{ step: "Penetrating", value: "6", notes: "= 11 – 5" },
					{ step: "Modifier", value: "×2", notes: "gurps.damage.type.imp" },
					{step: "Effective Modifier", value: "×2", notes: "Unliving"}
					{ step: "Injury", value: "1", notes: "= 1 × 0.5" },
				])
			})

			it.skip("... large piercing, ×1/2;", () => {
				let types = [DamageTypes["pi+"]]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 11
					let calc = _create(_roll, _target)
					expect(calc.penetratingDamage).toBe(6)
					expect(calc.injury).toBe(6)
				}
			})

			it.skip("... piercing, ×1/3;", () => {
				let types = [DamageTypes.pi]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 11
					let calc = _create(_roll, _target)
					expect(calc.penetratingDamage).toBe(6)
					expect(calc.injury).toBe(2)
				}
			})

			it.skip("... and small piercing, ×1/5.", () => {
				let types = [DamageTypes["pi-"]]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 15
					let calc = _create(_roll, _target)
					expect(calc.penetratingDamage).toBe(10)
					expect(calc.injury).toBe(2)
				}
			})
		})

		describe("Homogenous.", () => {
			beforeEach(() => {
				_torso._map.set("all", 5)
				_target.isHomogenous = true
			})

			it.skip("This gives impaling and huge piercing a wounding modifier of ×1/2; ...", () => {
				let types = [DamageTypes.imp, DamageTypes["pi++"]]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 11
					let calc = _create(_roll, _target)
					expect(calc.penetratingDamage).toBe(6)
					expect(calc.injury).toBe(3)
				}
			})

			it.skip("... large piercing, ×1/3;", () => {
				let types = [DamageTypes["pi+"]]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 11
					let calc = _create(_roll, _target)
					expect(calc.penetratingDamage).toBe(6)
					expect(calc.injury).toBe(2)
				}
			})

			it.skip("... piercing, ×1/5;", () => {
				let types = [DamageTypes.pi]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 15
					let calc = _create(_roll, _target)
					expect(calc.penetratingDamage).toBe(10)
					expect(calc.injury).toBe(2)
				}
			})

			it.skip("... and small piercing, ×1/10.", () => {
				let types = [DamageTypes["pi-"]]
				for (const type of types) {
					_roll.damageType = type
					_roll.basicDamage = 15
					let calc = _create(_roll, _target)
					expect(calc.penetratingDamage).toBe(10)
					expect(calc.injury).toBe(1)
				}
			})
		})

		describe("Diffuse.", () => {
			beforeEach(() => {
				_torso._map.set("all", 5)
				_target.isDiffuse = true
				_roll.basicDamage = 100
			})

			it.skip("Impaling and piercing attacks (of any size) never do more than 1 HP of injury.", () => {
				let types = [
					DamageTypes.imp,
					DamageTypes["pi++"],
					DamageTypes["pi+"],
					DamageTypes.pi,
					DamageTypes["pi-"],
				]
				for (const type of types) {
					_roll.damageType = type
					let calc = _create(_roll, _target)
					expect(calc.penetratingDamage).toBe(95)
					expect(calc.injury).toBe(1)
				}
			})

			it.skip("Other attacks can never do more than 2 HP of injury.", () => {
				let types = [
					DamageTypes.burn,
					DamageTypes.cor,
					DamageTypes.cr,
					DamageTypes.cut,
					DamageTypes.fat,
					DamageTypes.injury,
					DamageTypes.tox,
				]
				for (const type of types) {
					_roll.damageType = type
					let calc = _create(_roll, _target)
					expect(calc.injury).toBe(2)
				}
			})
		})
	})
})
