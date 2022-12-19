import { SYSTEM_NAME } from "@module/data"
import { HitLocation } from "@actor/character/hit_location"
import { DamageCalculator } from "./damage_calculator"
import { DamageRoll, DamageTarget } from "."
import { DamageType } from "./damage_type"
import { DiceGURPS } from "@module/dice"
import { convertRollStringToArrayOfInt } from "../../util/static"
import { toWord } from "@util/misc"
import { HitLocationUtil } from "./hitlocation_utils"

class ApplyDamageDialog extends Application {
	private calculator: DamageCalculator

	constructor(roll: DamageRoll, target: DamageTarget, options = {}) {
		super(options)
		this.calculator = new DamageCalculator(roll, target)
		if (this.calculator.damageRoll.locationId.toLowerCase() === "random") {
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
		const data = mergeObject(super.getData(options), {
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
		return data
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)

		html.find(".apply-control").on("change", this._onApplyControlChange.bind(this))
		html.find(".apply-control").on("click", this._onApplyControlClick.bind(this))
	}

	async _onApplyControlChange(event: JQuery.ChangeEvent): Promise<void> {
		event.preventDefault()

		const target = event.currentTarget

		switch (target.dataset.action) {
			case "location-select": {
				this.calculator.damageRoll.locationId = target.value
				this.render(true)
				break
			}

			case "location-dr": {
				// Need to override target.dr in the calculator.
			}
		}
	}

	async _onApplyControlClick(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()

		const target = event.currentTarget

		switch (target.dataset.action) {
			case "location-random": {
				this.calculator.damageRoll.locationId = await this._rollRandomLocation()
				this.render(true)
				break
			}
		}
	}

	async _rollRandomLocation(): Promise<string> {
		let result = await HitLocationUtil.rollRandomLocation(this.target.hitLocationTable)

		// Get localized version of the location id, if necessary.
		const location = result.location?.choice_name ?? "Torso"

		// Create an array suitable for drawing the dice on the ChatMessage.
		const rolls = result.roll.dice[0].results.map(e => {
			return { result: e.result, word: toWord(e.result) }
		})

		const message = await renderTemplate(`systems/${SYSTEM_NAME}/templates/message/random-location-roll.hbs`, {
			location: location,
			rolls: rolls,
			total: result.roll.total,
		})

		let messageData = {
			user: (game as Game).user,
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			content: message,
			roll: JSON.stringify(result.roll),
			sound: CONFIG.sounds.dice,
		}

		ChatMessage.create(messageData, {})

		return result.location?.id ?? "torso"
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
		return HitLocationUtil.getHitLocation(this.target.hitLocationTable, this.calculator.damageRoll.locationId)
	}

	private get dr(): number | undefined {
		return HitLocationUtil.getHitLocationDR(this.hitLocation, this.roll.damageType)
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
