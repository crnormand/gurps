import { DiceGURPS } from "@module/dice"
import { SYSTEM_NAME } from "@module/settings"
import { DamageCalculator } from "."
import { DamageAttacker, DamageRoll } from "./damage_roll"
import { createDamageTarget, DamageTarget } from "./damage_target"
import { DamageType } from "./damage_type"

class ApplyDamageDialog extends Application {
	static open() {
		console.log("Apply Damage!")

		// @ts-ignore game.actors.get until types v10
		let attacker = game.actors.get("WWwVSw6Pslsi3p69")

		let roll: DamageRoll = {
			locationId: "torso",
			attacker: attacker,
			dice: new DiceGURPS("3d-1x5"),
			basicDamage: 63,
			damageType: DamageType.cr,
			damageModifier: "ex",
			weapon: null,
			armorDivisor: 2,
			rofMultiplier: 0,
			range: null,
			isHalfDamage: false,
			isShotgunCloseRange: false,
			vulnerability: 1,
			internalExplosion: false,
		}

		// @ts-ignore game.actors.get until types v10
		let actor = game.actors.get("oxKGupaw2QLVfRQx")
		let target: DamageTarget = createDamageTarget(actor)

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
			classes: ["apply-damage", "gurps"],
		})
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object {
		return mergeObject(super.getData(options), {
			roll: this.roll,
			target: this.target,
			source: this.damageRollText,
			type: this.damageTypeAbbreviation,
			isExplosion: this.isExplosion,
		})
	}

	get title() {
		return "Apply Damage"
	}

	private get target(): DamageTarget {
		return this.calculator.target
	}

	private get roll(): DamageRoll {
		return this.calculator.damageRoll
	}

	private get damageRollText(): string {
		return `${this.roll.dice}${this.roll.armorDivisor ? ` (${this.roll.armorDivisor})` : ""}`
	}

	private get damageTypeAbbreviation(): string {
		let index = Object.values(DamageType).indexOf(this.roll.damageType)
		return Object.keys(DamageType)[index]
	}

	private get isExplosion(): boolean {
		return this.roll.damageModifier === "ex"
	}
}

export { ApplyDamageDialog }
