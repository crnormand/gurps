import { DiceGURPS } from "@module/dice"
import { SYSTEM_NAME } from "@module/settings"
import { DamageCalculator } from "."
import { DamageAttacker, DamageRoll } from "./damage_roll"
import { DamageTarget, TraitAdapter } from "./damage_target"
import { DamageType } from "./damage_type"
import { HitLocationTableAdapter } from "./hit_location"

class ApplyDamageDialog extends Application {
	static open() {
		console.log("Apply Damage!")
		let roll: DamageRoll = {
			locationId: "torso",
			attacker: { name: "Barberino" },
			dice: new DiceGURPS("3d+1"),
			basicDamage: 0,
			damageType: DamageType.injury,
			damageModifier: "",
			weapon: null,
			armorDivisor: 0,
			rofMultiplier: 0,
			range: null,
			isHalfDamage: false,
			isShotgunCloseRange: false,
			vulnerability: 0,
			internalExplosion: false,
		}

		let target: DamageTarget = {
			ST: 0,
			hitPoints: {
				value: 0,
				current: 0,
			},
			hitLocationTable: new HitLocationTableAdapter({
				name: "Humanoid",
				roll: new DiceGURPS("3d"),
				locations: [],
			}),

			getTrait: function (name: string): TraitAdapter | undefined {
				throw new Error("Function not implemented.")
			},

			hasTrait: function (name: string): boolean {
				throw new Error("Function not implemented.")
			},

			isUnliving: false,
			isHomogenous: false,
			isDiffuse: false,
		}

		const app = new ApplyDamageDialog(roll, target)
		app.render(true)
	}

	private calculator: DamageCalculator

	constructor(roll: DamageRoll, target: DamageTarget, options = {}) {
		super(options)
		this.calculator = new DamageCalculator(roll, target)
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			popOut: true,
			minimizable: false,
			resizable: false,
			id: "ApplyDamageDialog",
			template: `systems/${SYSTEM_NAME}/templates/damage_calculator/apply-damage.hbs`,
			classes: ["apply-damage"],
		})
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object {
		return mergeObject(super.getData(options), {
			attacker: this.attacker.name,
		})
	}

	private get attacker(): DamageAttacker {
		return this.calculator.damageRoll.attacker
	}
}

export { ApplyDamageDialog }
