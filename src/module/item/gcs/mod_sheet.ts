import { SYSTEM_NAME } from "@module/data"
import { i18n_f } from "@util"
import { ItemGCS } from "./document"
import { ItemSubstitutionSheet } from "./sub_sheet"

export class ModifierChoiceSheet extends FormApplication {
	object: ItemGCS & { modifiers?: Collection<ItemGCS & { enabled: boolean }> }

	choices: Record<string, boolean> = {}

	constructor(object: ItemGCS, options?: any) {
		super(object, options)
		this.object = object
	}

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			id: "sub-sheet",
			classes: ["gurps"],
			template: `systems/${SYSTEM_NAME}/templates/item/modifier_choice_sheet.hbs`,
			width: 400,
			height: 400,
			resizable: true,
			submitOnChange: true,
			submitOnClose: false,
			closeOnSubmit: false
		})
	}

	get title() {
		return i18n_f("gurps.item.substitution.title", { name: this.object.name })
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): MaybePromise<object> {
		const choices: Record<string, ItemGCS> = {}
		this.object.modifiers?.forEach(e => {
			choices[e._id] = e
		})
		return mergeObject(super.getData(options), {
			choices
		})
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find("#apply").on("click", event => this._onApply(event))
		html.find("#cancel").on("click", () => this.close())
	}

	protected async _onApply(event: JQuery.ClickEvent) {
		event.preventDefault()
		const updates = Object.keys(this.choices).map(k => {
			return { _id: k, "system.disabled": !this.choices[k] }
		})
		console.log(updates)
		await this.object.updateEmbeddedDocuments("Item", updates)
		await this.close()
		await ItemSubstitutionSheet.new(this.object)
	}

	protected async _updateObject(event: Event, formData?: any | undefined): Promise<any> {
		event.preventDefault()
		for (const k of Object.keys(formData)) {
			this.choices[k] = formData[k]
		}
	}

	static new(object: ItemGCS) {
		const sheet = new ModifierChoiceSheet(object)
		return sheet.render(true)
	}
}
