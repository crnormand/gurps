import { ItemSheetGURPS } from "@item/base"
import { ItemType, SYSTEM_NAME } from "@module/data"
import { DurationType } from "./data"

export class EffectSheet extends ItemSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["effect"]),
		})
		return options
	}

	override get template(): string {
		return `/systems/${SYSTEM_NAME}/templates/item/${ItemType.Effect}/sheet.hbs`
	}

	override get isEditable(): boolean {
		if (this.item.type === ItemType.Condition) return false
		return super.isEditable
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find("#modifiers .add").on("click", event => this._addModifier(event))
		html.find(".modifier .remove").on("click", event => this._removeModifier(event))
	}

	protected async _addModifier(event: JQuery.ClickEvent): Promise<any> {
		event.preventDefault()
		const modifiers = this.item.system.modifiers
		modifiers.push({
			name: "",
			modifier: 0,
			max: 0,
			cost: { value: 0, id: "" },
		})
		const update: any = {}
		update["system.modifiers"] = modifiers
		return this.item.update(update)
	}

	protected async _removeModifier(event: JQuery.ClickEvent): Promise<any> {
		const index = $(event.currentTarget).data("index")
		const modifiers = (this.item.system as any).modifiers
		modifiers.splice(index, 1)
		const update: any = {}
		update["system.modifiers"] = modifiers
		return this.item.update(update)
	}

	getData(options?: Partial<DocumentSheetOptions<Item>> | undefined) {
		const data = super.getData(options)
		if (this.item.system.duration.type !== DurationType.None)
			data.duration = this.item.system.duration[this.item.system.duration.type]
		else data.duration = 0
		return data
	}

	protected _updateObject(event: Event, formData: Record<string, any>): Promise<unknown> {
		formData["system.duration.seconds"] = 0
		formData["system.duration.turns"] = 0
		formData["system.duration.rounds"] = 0
		if (formData.duration) {
			const type: DurationType = formData["system.duration.type"]
			if (type !== DurationType.None) formData[`system.duration.${type}`] = formData.duration
			delete formData.duration
		}
		return super._updateObject(event, formData)
	}
}
