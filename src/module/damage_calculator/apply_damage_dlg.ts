import { SYSTEM_NAME } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { DamageCalculator } from "."
import { DamageRoll } from "./damage_roll"
import { createDamageTarget, DamageTarget } from "./damage_target"
import { DamageType } from "./damage_type"
import { HitLocationAdapter } from "./hit_location"
class ApplyDamageDialog extends Application {
	static open(attackerId: string, targetId: string) {
		console.log("Apply Damage!")

		// @ts-ignore game.actors.get until types v10
		let attacker = game.actors.get(attackerId)

		let roll: DamageRoll = {
			attacker: attacker,
			weapon: "Fine Spear (2H Swing)",
			locationId: "torso",
			dice: new DiceGURPS("2d+4"),
			basicDamage: 11,
			damageType: DamageType.cr,
			damageModifier: "",
			applyTo: "HP",
			armorDivisor: 2,
			rofMultiplier: 0,
			range: null,
			isHalfDamage: false,
			isShotgunCloseRange: false,
			vulnerability: 1,
			internalExplosion: false,
		}

		// @ts-ignore game.actors.get until types v10
		let actor = game.actors.get(targetId)
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
			resizable: true,
			width: 0,
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
			armorDivisorSelect: this.armorDivisorSelect,
			damageTypeChoices: DamageType,
			hitLocation: this.hitLocation,
			hitLocationChoices: this.hitLocationChoice,
			dr: this.dr,
			hardenedChoices: hardenedChoices,
			vulnerabilityChoices: vulnerabilityChoices,
			injuryToleranceChoices: injuryToleranceChoices,
			damageReductionChoices: damageReductionChoices,
			poolChoices: poolChoices,
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

	private get armorDivisorSelect(): string {
		return this.roll.armorDivisor.toString()
	}

	private get hitLocation(): HitLocationAdapter | undefined {
		console.log(this.target, this.target.hitLocationTable)
		return this.target.hitLocationTable.getLocation(this.calculator.damageRoll.locationId)
	}

	private get dr(): number | undefined {
		return this.hitLocation?.calc?.dr(this.roll.damageType)
	}

	private get hitLocationChoice(): Record<string, string> {
		const choice: Record<string, string> = {}
		this.target.hitLocationTable.locations.forEach(it => (choice[it.id] = it.choice_name))
		return choice
	}
}

const hardenedChoices = {
	0: "None (0)",
	1: "1",
	2: "2",
	3: "3",
	4: "4",
	5: "5",
	6: "6",
}

const vulnerabilityChoices = {
	1: "None",
	2: "×2",
	3: "×3",
	4: "×4",
}

const damageReductionChoices = {
	1: "None",
	2: "2",
	3: "3",
	4: "4",
}

const injuryToleranceChoices = {
	0: "None",
	1: "Unliving",
	2: "Homogenous",
	3: "Diffuse",
}

const poolChoices = {
	hp: "Hit Points",
	fp: "Fatigue Points",
	cp: "Control Points",
}

export { ApplyDamageDialog }
