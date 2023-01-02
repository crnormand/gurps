import { HitLocation } from "@actor/character/hit_location"
import { SYSTEM_NAME } from "@module/data"
import { toWord } from "@util/misc"
import { DamageRoll, DamageTarget } from "."
import { DamageCalculator } from "./damage_calculator"
import { DamageType } from "./damage_type"
import { HitLocationUtil } from "./hitlocation_utils"

class ApplyDamageDialog extends Application {
	static async create(roll: DamageRoll, target: DamageTarget, options = {}): Promise<ApplyDamageDialog> {
		const dialog = new ApplyDamageDialog(roll, target, options)

		if (dialog.calculator.damageRoll.locationId === "Random") {
			dialog.calculator.damageRoll.locationId = await dialog._rollRandomLocation()
		}

		return dialog
	}

	private calculator: DamageCalculator

	/**
	 * Use the static create() method, above, so that we can properly defer returning an instance until after we resolve
	 * a "Random" hit location.
	 *
	 * @param roll
	 * @param target
	 * @param options
	 */
	private constructor(roll: DamageRoll, target: DamageTarget, options = {}) {
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

	get title() {
		return "Apply Damage"
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object {
		const data = mergeObject(super.getData(options), {
			roll: this.roll,
			target: this.target,
			calculator: this.calculator,
			source: this.damageRollText,
			type: this.damageTypeAbbreviation,
			isExplosion: this.isExplosion,
			armorDivisorSelect: this.armorDivisorSelect,
			damageTypeChoices: DamageType,
			hitLocation: this.hitLocation,
			hitLocationChoices: this.hitLocationChoice,
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

		html.find(".apply-control").on("change", "click", this._onApplyControl.bind(this))
	}

	async _onApplyControl(event: JQuery.ChangeEvent | JQuery.ClickEvent): Promise<void> {
		const target = event.currentTarget

		if (event.type === "click" && ["button", "checkbox"].includes(target.type)) {
			this._onApplyControlClick(event, target)
		}

		if (event.type === "change" && ["number", "select-one"].includes(target.type)) {
			this._onApplyControlChange(event, target)
		}
	}

	async _onApplyControlChange(event: JQuery.ChangeEvent, target: any): Promise<void> {
		event.preventDefault()

		switch (target.dataset.action) {
			case "location-select": {
				this.calculator.damageRoll.locationId = target.value
				break
			}

			case "hardened-select": {
				this.calculator.overrideHardenedDR(target.value)
				break
			}

			case "location-dr": {
				// Need to override target.dr in the calculator.
				this.calculator.overrideRawDr(target.value)
				break
			}
		}

		this.render(true)
	}

	async _onApplyControlClick(event: JQuery.ClickEvent, target: any): Promise<void> {
		event.preventDefault()

		switch (target.dataset.action) {
			case "location-random": {
				this.calculator.damageRoll.locationId = await this._rollRandomLocation()
				break
			}

			case "location-flexible": {
				this.calculator.overrideFlexible(!this.calculator.isFlexibleArmor)
				break
			}
		}

		this.render(true)
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

	private overrideDR(dr: number | undefined) {
		this.calculator.overrideRawDr(dr)
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
