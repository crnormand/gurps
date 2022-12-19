import { SYSTEM_NAME } from "@module/data"
import { HitLocation } from "@actor/character/hit_location"
import { DamageCalculator } from "./damage_calculator"
import { DamageRoll, DamageTarget } from "."
import { DamageType } from "./damage_type"
import { getHitLocation, getHitLocationDR } from "./hitlocation_utils"
import { DiceGURPS } from "@module/dice"
import { convertRollStringToArrayOfInt } from "../../util/static"

class ApplyDamageDialog extends Application {
	private calculator: DamageCalculator

	constructor(roll: DamageRoll, target: DamageTarget, options = {}) {
		super(options)
		this.calculator = new DamageCalculator(roll, target)
		if (this.calculator.damageRoll.locationId === "Random") {
			this._rollRandomLocation().then(id => {
				this.calculator.damageRoll.locationId = id
				this.render(true)
			})
		}
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

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find(".apply-control").on("click", this._onApplyControl.bind(this))
	}

	async _onApplyControl(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()

		const target = event.currentTarget

		switch (target.dataset.action) {
			case "random-location": {
				this.calculator.damageRoll.locationId = await this._rollRandomLocation()
				this.render(true)
				break
			}
		}
	}

	async _rollRandomLocation(): Promise<string> {
		const dice = new DiceGURPS(this.target.hitLocationTable.roll)
		const roll = Roll.create(dice.toString(true))
		await roll.evaluate({ async: true })

		const rollTotal = roll.total!

		for (const location of this.target.hitLocationTable.locations) {
			const x: number[] = convertRollStringToArrayOfInt(location.calc!.roll_range)
			if (x.includes(rollTotal)) {
				console.log(`Roll = ${rollTotal}, location id = ${location.id}`)
				return location.id
			}
		}

		return "Default"
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

	private get hitLocation(): HitLocation | undefined {
		return getHitLocation(this.target.hitLocationTable, this.calculator.damageRoll.locationId)
	}

	private get dr(): number | undefined {
		return getHitLocationDR(this.hitLocation, this.roll.damageType)
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
