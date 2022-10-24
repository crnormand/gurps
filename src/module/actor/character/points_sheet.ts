import { SYSTEM_NAME } from "@module/settings"
import { i18n_f } from "@util"
import { CharacterGURPS } from "."
import { PointsRecord } from "./data"

export class PointRecordSheet extends FormApplication {
	object: CharacterGURPS

	constructor(object: CharacterGURPS, options?: any) {
		super(object, options)
		this.object = object
	}

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			classes: ["form", "points-sheet", "gurps"],
			template: `systems/${SYSTEM_NAME}/templates/actor/character/points-record.hbs`,
			width: 520,
			resizable: true,
			submitOnChange: false,
			submitOnClose: false,
			closeOnSubmit: true,
		})
	}

	get title() {
		return i18n_f("gurps.character.points_record.title", { name: this.object.name })
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): any {
		const actor = this.object

		return {
			optoins: options,
			actor: actor.toObject(),
			system: actor.system,
		}
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find(".add").on("click", event => this._onAdd(event))
		html.find(".delete").on("click", event => this._onDelete(event))
	}

	async _onAdd(event: JQuery.ClickEvent): Promise<number> {
		event.preventDefault()
		event.stopPropagation()
		const list = this.object.system.points_record
		const date = new Date().toISOString()
		list.unshift({
			when: date,
			points: 0,
			reason: ""
		})
		await this.object.update({ "system.points_record": list })
		await this.render()
		return list.length
	}

	async _onDelete(event: JQuery.ClickEvent): Promise<PointsRecord> {
		event.preventDefault()
		const list = this.object.system.points_record
		const index = parseInt($(event.currentTarget).data("index"))
		const deleted = list.splice(index, 1)
		await this.object.update({ "system.points_record": list })
		await this.render()
		return deleted[0]
	}

	protected async _updateObject(_event: Event, formData?: any | undefined): Promise<unknown> {
		if (!this.object.id) return
		for (const [key, value] of Object.entries(formData)) {
			// HACK: values of 0 are replaced with empty strings. this fixes it, but it's messy
			if (key.startsWith("NUMBER.")) {
				formData[key.replace("NUMBER.", "")] = isNaN(parseFloat(value as string))
					? 0
					: parseFloat(value as string)
				delete formData[key]
			}
		}
		const data: any = {}
		const record: any[] = this.object.system.points_record
		for (const k of Object.keys(formData)) {
			const index: number = parseInt(k.split(".")[0])
			const field: keyof PointsRecord = k.split(".")[1] as keyof PointsRecord
			let value: string | number = formData[k]
			if (field === "when") {
				const date = new Date(value)
				const options: any = {
					dateStyle: "medium",
					timeStyle: "short",
				}
				options.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
				value = date.toLocaleString("en-US", options).replace(" at", ",")
			}
			record[index][field] = value
		}
		data["system.points_record"] = record
		data["system.total_points"] = record.reduce((partialSum, a) => partialSum + a.points, 0)
		console.log(data)

		await this.object.update(data)
		return this.render()
	}

	protected _getHeaderButtons(): Application.HeaderButton[] {
		const all_buttons = [
			{
				label: "",
				class: "apply",
				icon: "gcs-checkmark",
				onclick: (event: any) => this._onSubmit(event),
			},
			...super._getHeaderButtons(),
		]
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-not"
		return all_buttons
	}
}
