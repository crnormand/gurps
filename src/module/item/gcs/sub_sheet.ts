import { SYSTEM_NAME } from "@module/data"
import { flatten, LocalizeGURPS, prepareFormData } from "@util"
import { ItemGCS } from "./document"

export class ItemSubstitutionSheet extends FormApplication {
	object: ItemGCS

	nextObjects: ItemGCS[]

	subs: Record<string, string> = {}

	keys: Record<string, string[]> = {}

	constructor(items: ItemGCS[], options?: any) {
		const item = items.shift()!
		super(item, options)
		this.object = item
		this.nextObjects = items
		this._init()
	}

	private _init() {
		const obj = { ...duplicate(this.object) } as any
		if ((this.object as any).modifiers) {
			const objList: any = {}
			const list = this.object.items
			for (let i = 0; i < list.size; i++) {
				const e = list.contents[i]
				if (
					((this.object as any).modifiers.has(e.id) && (this.object as any).modifiers.get(e.id).enabled) ||
					!(this.object as any).modifiers.has(e.id)
				)
					objList[i] = e
			}
		}
		const flatItem = flatten(obj)
		if (!flatItem) return
		for (const k of Object.keys(flatItem)) {
			if (typeof flatItem[k] === "string" && flatItem[k].length > 2 && flatItem[k].match(/@[^@]*@/)) {
				for (const j of flatItem[k].match(/@[^@]*@/g)) {
					const key = j.slice(1, -1)
					if (this.keys[key]) this.keys[key] = [...this.keys[key], k]
					else this.keys[key] = [k]
					this.subs[key] = ""
				}
			}
		}
	}

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			id: "sub-sheet",
			classes: ["gurps"],
			template: `systems/${SYSTEM_NAME}/templates/item/sub-sheet.hbs`,
			width: 400,
			height: 400,
			resizable: true,
			submitOnChange: true,
			submitOnClose: false,
			closeOnSubmit: false,
		})
	}

	get title() {
		return LocalizeGURPS.format(LocalizeGURPS.translations.gurps.item.substitution.title, {
			name: this.object.name,
		})
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): MaybePromise<object> {
		return mergeObject(super.getData(options), {
			subs: this.subs,
		})
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find("#apply").on("click", event => this._onApply(event))
		html.find("#cancel").on("click", event => this._onCancel(event))
	}

	protected async _onApply(event: JQuery.ClickEvent) {
		event.preventDefault()
		let update: any = { _id: this.object._id }
		for (const k of Object.keys(this.subs)) {
			for (const j of this.keys[k]) {
				const key = j.startsWith("array.") ? j.replace("array.", "") : j
				if (!update[j]) update[j] = getProperty(this.object, key) || ""
				update[j] = update[j].replaceAll(`@${k}@`, this.subs[k])
			}
		}
		console.log(duplicate(update))
		update = prepareFormData(update, { ...this.object })
		this.object.update(update)
		// Const items = this.nextObjects
		await this.close()
		// ModifierChoiceSheet.new(items {puuid: this.puuid})
	}

	protected async _onCancel(event: JQuery.ClickEvent) {
		event.preventDefault()
		// Const items = this.nextObjects
		await this.close()
		// ModifierChoiceSheet.new(items)
	}

	protected async _updateObject(event: Event, formData?: any | undefined): Promise<any> {
		event.preventDefault()
		for (const k of Object.keys(formData)) {
			this.subs[k] = formData[k]
		}
	}

	static new(items: ItemGCS[]): ItemSubstitutionSheet | null {
		if (items.length === 0) return null
		const sheet = new ItemSubstitutionSheet(items)
		if (Object.keys(sheet.subs).length === 0) return null
		// Return sheet.render(true)
		return sheet
	}
}
