import { CharacterGURPS } from "@actor"
import { FeatureType } from "@feature/base"
import { ItemGURPS } from "@item"
import { NumberComparison, StringComparison, StudyType } from "@module/data"
import { SYSTEM_NAME } from "@module/settings"
import { WeaponSheet } from "@module/weapon/sheet"
import { PrereqType } from "@prereq"
import { i18n, prepareFormData } from "@util"
import { BaseItemGURPS } from "."

// @ts-ignore
export class ItemSheetGURPS extends ItemSheet {
	getData(options?: Partial<ItemSheet.Options>): any {
		const itemData = this.object.toObject(false)
		const attributes: Record<string, string> = {}
		const locations: Record<string, string> = {}
		const actor = this.item.actor as unknown as CharacterGURPS
		if (actor) {
			actor.attributes.forEach(e => {
				attributes[e.attr_id] = e.attribute_def.name
			})
			for (const e of actor.system.settings.body_type.locations) {
				locations[e.id] = e.choice_name
			}
		} else {
			mergeObject(attributes, {
				st: "ST",
				dx: "DX",
				iq: "IQ",
				ht: "HT",
				will: "Will",
				fright_check: "Fright Check",
				per: "Perception",
				vision: "Vision",
				hearing: "Hearing",
				taste_smell: "Taste & Smell",
				touch: "Touch",
				basic_speed: "Basic Speed",
				basic_move: "Basic Move",
				fp: "FP",
				hp: "HP",
			})
			mergeObject(locations, {
				eyes: "Eyes",
				skull: "Skull",
				face: "Face",
				leg: "Leg",
				arm: "Arm",
				torso: "Torso",
				groin: "Groin",
				hand: "Hand",
				foot: "Foot",
				neck: "Neck",
				vitals: "Vitals",
			})
		}
		attributes.dodge = i18n("gurps.attributes.dodge")
		attributes.parry = i18n("gurps.attributes.parry")
		attributes.block = i18n("gurps.attributes.block")
		const item = this.item as BaseItemGURPS
		const meleeWeapons = [...item.meleeWeapons].map(e => mergeObject(e[1], { index: e[0] }))
		const rangedWeapons = [...item.rangedWeapons].map(e => mergeObject(e[1], { index: e[0] }))

		const sheetData = {
			...super.getData(options),
			...{
				document: item,
				meleeWeapons: meleeWeapons,
				rangedWeapons: rangedWeapons,
				item: itemData,
				system: (itemData as any).system,
				config: (CONFIG as any).GURPS,
				attributes: attributes,
				locations: locations,
				sysPrefix: "array.system.",
			},
		}

		return sheetData
	}

	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions
		mergeObject(options, {
			width: 620,
			min_width: 620,
			height: 800,
			classes: options.classes.concat(["item", "gurps"]),
		})
		return options
	}

	get template(): string {
		return `/systems/${SYSTEM_NAME}/templates/item/${this.item.type}/sheet.hbs`
	}

	override activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find(".prereq .add-child").on("click", event => this._addPrereqChild(event))
		html.find(".prereq .add-list").on("click", event => this._addPrereqList(event))
		html.find(".prereq .remove").on("click", event => this._removePrereq(event))
		html.find(".prereq .type").on("change", event => this._onPrereqTypeChange(event))
		html.find("#features .add").on("click", event => this._addFeature(event))
		html.find(".feature .remove").on("click", event => this._removeFeature(event))
		html.find(".feature .type").on("change", event => this._onFeatureTypeChange(event))
		html.find("#study .add").on("click", event => this._addStudy(event))
		html.find(".study-entry .remove").on("click", event => this._removeStudy(event))
		html.find(".weapon-list > :not(.header)").on("dblclick", event => this._onWeaponEdit(event))
		html.find("textarea")
			.each(function () {
				const height = this.scrollHeight - 2
				this.setAttribute("style", `height:${height}px;`)
			})
			.on("input", function () {
				const height = this.scrollHeight
				// Const height = this.value.split("\r").length * 24;
				this.style.height = "0"
				this.style.height = `${height}px`
			})

		// Html.find("span.input").on("blur", event => this._onSubmit(event as any));
	}

	protected _onSubmit(event: Event, context?: any): Promise<Partial<Record<string, unknown>>> {
		return super._onSubmit(event, context)
	}

	protected async _updateObject(event: Event, formData: Record<string, any>): Promise<unknown> {
		// FormApplicationGURPS.updateObject(event, formData)
		formData = prepareFormData(event, formData, this.object)
		if (formData["system.tags"] && typeof formData["system.tags"] === "string") {
			const tags = formData["system.tags"].split(",").map(e => e.trim())
			formData["system.tags"] = tags
		}
		if (formData["system.college"] && typeof formData["system.college"] === "string") {
			const college = formData["system.college"].split(",").map(e => e.trim())
			formData["system.college"] = college
		}
		return super._updateObject(event, formData)
	}

	protected async _addPrereqChild(event: JQuery.ClickEvent): Promise<any> {
		event.preventDefault()
		const path = $(event.currentTarget).data("path").replace("array.", "")
		const prereqs = getProperty(this.item, `${path}.prereqs`)
		prereqs.push({
			type: "trait_prereq",
			name: { compare: StringComparison.Is, qualifier: "" },
			notes: { compare: StringComparison.None, qualifier: "" },
			level: { compare: NumberComparison.AtLeast, qualifier: 0 },
			has: true,
		})
		const formData: any = {}
		formData[`array.${path}.prereqs`] = prereqs
		return this._updateObject(null as unknown as Event, formData)
	}

	protected async _addPrereqList(event: JQuery.ClickEvent): Promise<any> {
		event.preventDefault()
		const path = $(event.currentTarget).data("path").replace("array.", "")
		const prereqs = getProperty(this.item, `${path}.prereqs`)
		prereqs.push({
			type: "prereq_list",
			prereqs: [],
			when_tl: { compare: NumberComparison.None },
		})
		const formData: any = {}
		formData[`array.${path}.prereqs`] = prereqs
		return this._updateObject(null as unknown as Event, formData)
	}

	protected async _removePrereq(event: JQuery.ClickEvent): Promise<any> {
		event.preventDefault()
		let path = $(event.currentTarget).data("path").replace("array.", "")
		const items = path.split(".")
		const index = items.pop()
		path = items.join(".")
		const prereqs = getProperty(this.item, `${path}`)
		prereqs.splice(index, 1)
		const formData: any = {}
		formData[`array.${path}`] = prereqs
		return this._updateObject(null as unknown as Event, formData)
	}

	protected async _onPrereqTypeChange(event: JQuery.ChangeEvent): Promise<any> {
		event.preventDefault()
		const value = event.currentTarget.value
		const PrereqConstructor = (CONFIG as any).GURPS.Prereq.classes[value as PrereqType]
		let path = $(event.currentTarget).data("path").replace("array.", "")
		const items = path.split(".")
		const index = items.pop()
		path = items.join(".")
		const prereqs = getProperty(this.item, `${path}`)
		prereqs[index] = {
			type: value,
			...PrereqConstructor.defaults,
			has: prereqs[index].has,
		}
		const formData: any = {}
		formData[`array.${path}`] = prereqs
		return this._updateObject(null as unknown as Event, formData)
	}

	protected async _addFeature(event: JQuery.ClickEvent): Promise<any> {
		event.preventDefault()
		const features = (this.item.system as any).features
		features.push({
			type: "attribute_bonus",
			attribute: "st",
			limitation: "none",
			amount: 1,
			per_level: false,
			levels: 0,
		})
		const update: any = {}
		update["system.features"] = features
		return this.item.update(update)
	}

	protected async _removeFeature(event: JQuery.ClickEvent): Promise<any> {
		const index = $(event.currentTarget).data("index")
		const features = (this.item.system as any).features
		features.splice(index, 1)
		const update: any = {}
		update["system.features"] = features
		return this.item.update(update)
	}

	protected async _addStudy(event: JQuery.ClickEvent): Promise<any> {
		event.preventDefault()
		const study = (this.item.system as any).study
		study.push({
			type: StudyType.Self,
			hours: 0,
			note: "",
		})
		const update: any = {}
		update["system.study"] = study
		return this.item.update(update)
	}

	protected async _removeStudy(event: JQuery.ClickEvent): Promise<any> {
		const index = $(event.currentTarget).data("index")
		const study = (this.item.system as any).study
		study.splice(index, 1)
		const update: any = {}
		update["system.study"] = study
		return this.item.update(update)
	}

	protected async _onFeatureTypeChange(event: JQuery.ChangeEvent): Promise<any> {
		const value = event.currentTarget.value
		const index = $(event.currentTarget).data("index")
		const FeatureConstructor = (CONFIG as any).GURPS.Feature.classes[value as FeatureType]
		const features = (this.item.system as any).features
		features[index] = {
			type: value,
			...FeatureConstructor.defaults,
		}
		// Const preUpdate: any = {}
		const update: any = {}
		// PreUpdate[`system.features.${index}`] = {}
		update["system.features"] = features
		// Await this.item.update(preUpdate, { render: false })
		return this.item.update(update)
	}

	protected async _onWeaponEdit(event: JQuery.DoubleClickEvent): Promise<any> {
		event.preventDefault()
		const index = $(event.currentTarget).data("index")
		new WeaponSheet(this.item as ItemGURPS, index, {}).render(true)
	}

	protected override _getHeaderButtons(): Application.HeaderButton[] {
		const buttons: Application.HeaderButton[] = []
		const all_buttons = [...buttons, ...super._getHeaderButtons()]
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-circled-x"
		return all_buttons
	}
}

// @ts-ignore
export interface ItemSheetGURPS extends ItemSheet {
	object: BaseItemGURPS
}
