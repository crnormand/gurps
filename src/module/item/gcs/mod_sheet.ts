import { SYSTEM_NAME } from "@module/data"
import { LocalizeGURPS } from "@util"
import { ItemGCS } from "./document"
import { ItemSubstitutionSheet } from "./sub_sheet"

export class ModifierChoiceSheet extends FormApplication {
	object: ItemGCS & { modifiers?: Collection<ItemGCS & { enabled: boolean }> }

	nextObjects: ItemGCS[]

	puuid: string

	choices: Record<string, boolean> = {}

	constructor(items: ItemGCS[], options?: any) {
		const item = items.shift()!
		super(item, options)
		this.object = item
		this.nextObjects = items
		this._init()
		this.puuid = options?.puuid || item.uuid
	}

	private _init() {
		if ((this.object as any).children) {
			this.nextObjects = [...this.nextObjects, ...(this.object as any).children]
		}
	}

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			id: "mod-choice-sheet",
			classes: ["gurps"],
			template: `systems/${SYSTEM_NAME}/templates/item/mod-choice-sheet.hbs`,
			width: 400,
			height: 400,
			resizable: true,
			submitOnChange: true,
			submitOnClose: false,
			closeOnSubmit: false,
		})
	}

	get title() {
		return LocalizeGURPS.format(LocalizeGURPS.translations.gurps.item.substitution.modifiers, {
			name: this.object.name,
		})
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): MaybePromise<object> {
		const choices: Record<string, ItemGCS> = {}
		this.object.modifiers?.forEach(e => {
			choices[e._id] = e
		})
		return mergeObject(super.getData(options), {
			choices,
		})
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find("#apply").on("click", event => this._onApply(event))
		html.find("#cancel").on("click", event => this._onCancel(event))
	}

	protected async _onApply(event: JQuery.ClickEvent) {
		event.preventDefault()
		const updates = Object.keys(this.choices).map(k => {
			return { _id: k, "system.disabled": !this.choices[k] }
		})
		console.log(updates)
		await this.object.updateEmbeddedDocuments("Item", updates)
		const items = this.nextObjects
		await this.close()
		ModifierChoiceSheet.new(items, { puuid: this.puuid })
	}

	protected async _onCancel(event: JQuery.ClickEvent) {
		event.preventDefault()
		const items = this.nextObjects
		await this.close()
		ModifierChoiceSheet.new(items, { puuid: this.puuid })
	}

	protected async _updateObject(event: Event, formData?: any | undefined): Promise<any> {
		event.preventDefault()
		for (const k of Object.keys(formData)) {
			this.choices[k] = formData[k]
		}
	}

	static new(items: ItemGCS[], options?: any): any {
		if (items.length === 0) {
			const item = fromUuidSync(options?.puuid)
			return ItemSubstitutionSheet.new([item as any])
		}
		const sheet = new ModifierChoiceSheet(items, options)
		console.log(sheet.object.modifiers)
		if (sheet.object.modifiers && sheet.object.modifiers?.size !== 0) {
			console.log("HAS MODIFIERS")
			return sheet?.render(true)
		}
		const newItems = sheet.nextObjects
		return ModifierChoiceSheet.new(newItems, { puuid: sheet.puuid })
	}
}
