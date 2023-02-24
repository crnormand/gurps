import { ItemFlags } from "@item/base"
import { SYSTEM_NAME } from "@module/data"
import { flatten, i18n_f, prepareFormData } from "@util"
import { ItemGCS } from "./document"

export class ItemSubstitutionSheet extends FormApplication {
	object: ItemGCS

	subs: Record<string, string> = {}

	keys: Record<string, string[]> = {}

	constructor(object: ItemGCS, options?: any) {
		console.log(object)
		super(object, options)
		this.object = object
		this._init()
	}

	private _init() {
		const obj = { ...duplicate(this.object) } as any
		if ((this.object as any).modifiers) {
			const objList: any = {}
			const list = obj.flags[SYSTEM_NAME][ItemFlags.Contents]
			for (let i = 0; i < list.length; i++) {
				const e = list[i]
				if ((this.object as any).modifiers.get(e._id).enabled ||
					!(this.object as any).modifiers.has(e._id))
					objList[i] = e
			}

		}
		const flatItem = flatten(obj)
		if (!flatItem) return
		for (const k of Object.keys(flatItem)) {
			if (
				typeof flatItem[k] === "string" &&
				flatItem[k].length > 2 &&
				flatItem[k].match(/@[^@]*@/)
			) {
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
			template: `systems/${SYSTEM_NAME}/templates/item/substitution_sheet.hbs`,
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
		return mergeObject(super.getData(options), {
			subs: this.subs
		})
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find("#apply").on("click", event => this._onApply(event))
		html.find("#cancel").on("click", () => this.close())
	}

	protected _onApply(event: JQuery.ClickEvent) {
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
		return this.close()
	}

	protected async _updateObject(event: Event, formData?: any | undefined): Promise<any> {
		event.preventDefault()
		for (const k of Object.keys(formData)) {
			this.subs[k] = formData[k]
		}
	}

	static new(object: ItemGCS) {
		const sheet = new ItemSubstitutionSheet(object)
		if (Object.keys(sheet.subs).length === 0) return
		return sheet.render(true)
	}
}
