import { AttributeDefObj, AttributeType } from "@module/attribute/attribute_def"
import { ResourceTrackerDefObj } from "@module/resource_tracker/tracker_def"
import { CharacterGURPS } from "."
import { CharacterImporter } from "./import"
import { CharacterSheetGURPS } from "./sheet"
import { i18n, i18n_f, prepareFormData } from "@util"
import { SETTINGS, SYSTEM_NAME } from "@module/data"
import { CharacterSettings } from "./data"
import { HitLocationTable } from "./hit_location"
import { DnD } from "@util/drag_drop"

export class CharacterSheetConfig extends FormApplication {
	object: CharacterGURPS

	filename: string

	file?: { text: string; name: string; path: string }

	attributes: AttributeDefObj[]

	resource_trackers: ResourceTrackerDefObj[]

	body_type: HitLocationTable

	constructor(object: CharacterGURPS, options?: any) {
		super(object, options)
		this.object = object
		this.filename = ""
		this.attributes = this.object.system.settings.attributes
		this.resource_trackers = this.object.system.settings.resource_trackers
		this.body_type = this.object.system.settings.body_type
	}

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			classes: ["form", "character-config", "gurps"],
			template: `systems/${SYSTEM_NAME}/templates/actor/character/config/config.hbs`,
			width: 450,
			resizable: true,
			submitOnChange: true,
			submitOnClose: true,
			closeOnSubmit: false,
			tabs: [
				{
					navSelector: "nav",
					contentSelector: "section.content",
					initital: "sheet-settings",
				},
			],
			dragDrop: [{ dragSelector: ".item-list .item .controls .drag", dropSelector: null }],
			scrollY: [".content", ".item-list", ".tab"],
		})
	}

	get title() {
		return i18n_f("gurps.character.settings.header", { name: this.object.name })
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): any {
		const actor = this.object
		this.attributes = this.object.system.settings.attributes
		this.resource_trackers = this.object.system.settings.resource_trackers
		const attributes = actor.settings.attributes.map(e =>
			mergeObject(e, { order: actor.attributes.get(e.id)!.order })
		)
		const resourceTrackers = actor.settings.resource_trackers

		return {
			options: options,
			actor: actor.toObject(),
			system: actor.system,
			attributes: attributes,
			resourceTrackers: resourceTrackers,
			locations: actor.system.settings.body_type,
			filename: this.filename,
			config: (CONFIG as any).GURPS,
		}
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)

		html.find("a.reset-all").on("click", event => this._onReset(event))
		html.find("input[name$='.id']").on("input", event => {
			const value = $(event.currentTarget).val()
			const name = $(event.currentTarget).prop("name")
			let invalid = false
			if (value === "") invalid = true
			this.attributes.forEach((e, i) => {
				if (e.id === value && name !== `attributes.${i}.id`) invalid = true
			})
			this.resource_trackers.forEach((e, i) => {
				if (e.id === value && name !== `resource_trackers.${i}.id`) invalid = true
			})
			if (invalid) $(event.currentTarget).addClass("invalid")
			else $(event.currentTarget).removeClass("invalid")
		})

		// Re-uploading old character
		html.find(".quick-import").on("click", event => this._reimport(event))

		// Uploading new character
		if ((game as Game).settings.get(SYSTEM_NAME, SETTINGS.SERVER_SIDE_FILE_DIALOG)) {
			html.find("input[type='file']").on("click", event => {
				event.preventDefault()
				const filepicker = new FilePicker({
					callback: (path: string) => {
						const request = new XMLHttpRequest()
						request.open("GET", path)
						new Promise(resolve => {
							request.onload = () => {
								if (request.status === 200) {
									const text = request.response
									this.file = {
										text: text,
										name: path,
										path: request.responseURL,
									}
									this.filename = String(path).split(/\\|\//).pop() || ""
									this.render()
								}
								resolve(this)
							}
						})
						request.send(null)
					},
				})
				filepicker.extensions = [".gcs", ".xml", ".gca5"]
				filepicker.render(true)
			})
		} else {
			html.find("input[type='file']").on("change", event => {
				const filename = String($(event.currentTarget).val()).split(/\\|\//).pop() || ""
				const files = $(event.currentTarget).prop("files")
				this.filename = filename
				if (files) {
					readTextFromFile(files[0]).then(
						text =>
							(this.file = {
								text: text,
								name: files[0].name,
								path: files[0].path,
							})
					)
				}
				this.render()
			})
		}
		html.find(".import-confirm").on("click", event => this._import(event))
		html.find("textarea")
			.each(function () {
				// Const height = this.scrollHeight
				this.setAttribute("style", "height:	auto;")
			})
			.on("input", function () {
				const height = this.scrollHeight
				// Const height = this.value.split("\r").length * 24;
				this.style.height = "0"
				this.style.height = `${height}px`
			})

		html.find(".item").on("dragover", event => this._onDragItem(event))
		html.find(".add").on("click", event => this._onAddItem(event))
		html.find(".delete").on("click", event => this._onDeleteItem(event))
		html.find(".export").on("click", event => this._onExport(event))
	}

	async _onReset(event: JQuery.ClickEvent) {
		event.preventDefault()
		const type = $(event.currentTarget).data("type")
		const default_attributes = (game as Game).settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_ATTRIBUTES}.attributes`
		) as CharacterSettings["attributes"]
		const default_resource_trackers = (game as Game).settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_RESOURCE_TRACKERS}.resource_trackers`
		) as CharacterSettings["resource_trackers"]
		const default_hit_locations = {
			name: (game as Game).settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.name`),
			roll: (game as Game).settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.roll`),
			locations: (game as Game).settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.locations`),
		} as HitLocationTable
		const update: any = {}
		if (type === "attributes") update["system.settings.attributes"] = default_attributes
		if (type === "resource_trackers") update["system.settings.resource_trackers"] = default_resource_trackers
		if (type === "locations") update["system.settings.body_type"] = default_hit_locations
		await this.object.update(update)
		return this.render()
	}

	_onExport(event: JQuery.ClickEvent) {
		event.preventDefault()
		return this.object.saveLocal()
	}

	async _onAddItem(event: JQuery.ClickEvent) {
		event.preventDefault()
		event.stopPropagation()
		let path = ""
		let locations = []
		const type:
			| "attributes"
			| "resource_trackers"
			| "attribute_thresholds"
			| "tracker_thresholds"
			| "locations"
			| "sub_table" = $(event.currentTarget).data("type")
		let new_id = ""
		if (type === "attributes" || type === "resource_trackers")
			for (let n = 0; n < 26; n++) {
				const char = String.fromCharCode(97 + n)
				if (![...this.attributes, ...this.resource_trackers].find(e => e.id === char)) {
					new_id = char
					break
				}
			}
		let formData: any = {}
		switch (type) {
			case "attributes":
				// TODO: account for possibility of all letters being taken
				this.attributes.push({
					type: AttributeType.Integer,
					id: new_id,
					name: "",
					attribute_base: "",
					cost_per_point: 0,
					cost_adj_percent_per_sm: 0,
				})
				await this.object.update({ "system.settings.attributes": this.attributes })
				return this.render()
			case "resource_trackers":
				this.resource_trackers.push({
					id: new_id,
					name: "",
					full_name: "",
					max: 0,
					isMaxEnforced: false,
					min: 0,
					isMinEnforced: false,
					order: this.resource_trackers.length,
					thresholds: [],
				})
				await this.object.update({ "system.settings.resource_trackers": this.resource_trackers })
				return this.render()
			case "attribute_thresholds":
				this.attributes[$(event.currentTarget).data("id")].thresholds ??= []
				this.attributes[$(event.currentTarget).data("id")].thresholds!.push({
					state: "",
					explanation: "",
					expression: "",
					ops: [],
				})
				await this.object.update({ "system.settings.attributes": this.attributes })
				return this.render()
			case "tracker_thresholds":
				this.resource_trackers[$(event.currentTarget).data("id")].thresholds ??= []
				this.resource_trackers[$(event.currentTarget).data("id")].thresholds!.push({
					state: "",
					explanation: "",
					expression: "",
					ops: [],
				})
				await this.object.update({ "system.settings.resource_trackers": this.resource_trackers })
				return this.render()
			case "locations":
				path = $(event.currentTarget).data("path").replace("array.", "")
				locations = getProperty(this.object, `${path}.locations`) ?? []
				locations.push({
					id: i18n("gurps.placeholder.hit_location.id"),
					choice_name: i18n("gurps.placeholder.hit_location.choice_name"),
					table_name: i18n("gurps.placeholder.hit_location.table_name"),
					slots: 0,
					hit_penalty: 0,
					dr_bonus: 0,
					description: "",
				})
				formData ??= {}
				formData[`array.${path}.locations`] = locations
				await this._updateObject(event as unknown as Event, formData)
				return this.render()
			case "sub_table":
				path = $(event.currentTarget).data("path").replace("array.", "")
				const index = Number($(event.currentTarget).data("index"))
				locations = getProperty(this.object, `${path}`) ?? []
				locations[index].sub_table = {
					name: "",
					roll: "1d",
					locations: [
						{
							id: i18n("gurps.placeholder.hit_location.id"),
							choice_name: i18n("gurps.placeholder.hit_location.choice_name"),
							table_name: i18n("gurps.placeholder.hit_location.table_name"),
							slots: 0,
							hit_penalty: 0,
							dr_bonus: 0,
							description: "",
						},
					],
				}
				formData ??= {}
				formData[`array.${path}`] = locations
				await this._updateObject(event as unknown as Event, formData)
				return this.render()
		}
	}

	private async _onDeleteItem(event: JQuery.ClickEvent) {
		event.preventDefault()
		event.stopPropagation()
		const path = $(event.currentTarget).data("path")?.replace("array.", "")
		let locations = []
		let formData: any = {}
		const type:
			| "attributes"
			| "resource_trackers"
			| "attribute_thresholds"
			| "tracker_thresholds"
			| "locations"
			| "sub_table" = $(event.currentTarget).data("type")
		const index = Number($(event.currentTarget).data("index")) || 0
		const parent_index = Number($(event.currentTarget).data("pindex")) || 0
		switch (type) {
			case "attributes":
				this.attributes.splice(index, 1)
				await this.object.update({ "system.settings.attributes": this.attributes })
				return this.render()
			case "resource_trackers":
				this.resource_trackers.splice(index, 1)
				await this.object.update({ "system.settings.resource_trackers": this.resource_trackers })
				return this.render()
			case "attribute_thresholds":
				this.attributes[parent_index].thresholds?.splice(index, 1)
				await this.object.update({ "system.settings.attributes": this.attributes })
				return this.render()
			case "tracker_thresholds":
				this.resource_trackers[parent_index].thresholds?.splice(index, 1)
				await this.object.update({ "system.settings.resource_trackers": this.resource_trackers })
				return this.render()
			case "locations":
				locations = getProperty(this.object, `${path}`) ?? []
				locations.splice($(event.currentTarget).data("index"), 1)
				formData ??= {}
				formData[`array.${path}`] = locations
				await this._updateObject(event as unknown as Event, formData)
				return this.render()
			case "sub_table":
				locations = getProperty(this.object, `${path}`) ?? []
				delete locations[index].sub_table
				formData ??= {}
				formData[`array.${path}`] = locations
				await this._updateObject(event as unknown as Event, formData)
				return this.render()
		}
	}

	protected async _reimport(event: JQuery.ClickEvent) {
		event.preventDefault()
		const import_path = this.object.importData.path
		const import_name = import_path.match(/.*[/\\]Data[/\\](.*)/)
		const file_path = import_name?.[1].replace(/\\/g, "/") || this.object.importData.name
		const request = new XMLHttpRequest()
		request.open("GET", file_path)

		new Promise(resolve => {
			request.onload = () => {
				if (request.status === 200) {
					const text = request.response
					CharacterImporter.import(this.object, {
						text: text,
						name: file_path,
						path: import_path,
					})
				}
				resolve(this)
			}
		})
		request.send(null)
	}

	protected async _import(event: JQuery.ClickEvent) {
		event.preventDefault()
		if (this.file) {
			const file = this.file
			this.file = undefined
			this.filename = ""
			CharacterImporter.import(this.object, file)
		}
	}

	protected _getHeaderButtons(): Application.HeaderButton[] {
		const all_buttons = [
			// {
			// 	label: "",
			// 	class: "apply",
			// 	icon: "gcs-checkmark",
			// 	onclick: (event: any) => this._onSubmit(event),
			// },
			...super._getHeaderButtons(),
		]
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-circled-x"
		return all_buttons
	}

	protected async _updateObject(event: Event, formData?: any | undefined): Promise<unknown> {
		formData = prepareFormData(event, formData, this.object)
		const element = $(event.currentTarget!)
		if (element.hasClass("invalid")) delete formData[element.prop("name")]
		if (!this.object.id) return
		if (formData["system.settings.block_layout"])
			formData["system.settings.block_layout"] = formData["system.settings.block_layout"].split("\n")
		await this.object.update(formData)
		return this.render()
	}

	async _onDragStart(event: DragEvent) {
		// TODO:update
		const item = $(event.currentTarget!)
		const type: "attributes" | "resource_trackers" | "attribute_thresholds" | "tracker_thresholds" | "locations" =
			item.data("type")
		const index = Number(item.data("index"))
		const parent_index = Number(item.data("pindex")) || 0
		event.dataTransfer?.setData(
			"text/plain",
			JSON.stringify({
				type: type,
				index: index,
				parent_index: parent_index,
			})
		)
		;(event as any).dragType = type
	}

	protected _onDragItem(event: JQuery.DragOverEvent): void {
		const element = $(event.currentTarget!)
		const heightAcross = (event.pageY! - element.offset()!.top) / element.height()!
		element.siblings(".item").removeClass("border-top").removeClass("border-bottom")
		if (heightAcross > 0.5) {
			element.removeClass("border-top")
			element.addClass("border-bottom")
		} else {
			element.removeClass("border-bottom")
			element.addClass("border-top")
		}
	}

	protected async _onDrop(event: DragEvent): Promise<unknown> {
		let dragData = DnD.getDragData(event, DnD.TEXT_PLAIN)

		let element = $(event.target!)
		if (!element.hasClass("item")) element = element.parent(".item")

		const target_index = element.data("index")
		const above = element.hasClass("border-top")
		if (dragData.order === target_index) return this.render()
		if (above && dragData.order === target_index - 1) return this.render()
		if (!above && dragData.order === target_index + 1) return this.render()

		let container: any[] = []
		const path = element.data("path")?.replace("array.", "")
		if (dragData.type === "attributes") container = this.attributes
		else if (dragData.type === "resource_trackers") container = this.resource_trackers
		else if (dragData.type === "attribute_thresholds") container = this.attributes
		else if (dragData.type === "tracker_thresholds") container = this.resource_trackers
		else if (dragData.type === "locations") container = getProperty(this.object, path)
		if (!container) return

		let item
		if (dragData.type.includes("_thresholds")) {
			item = container[dragData.parent_index].thresholds.splice(dragData.index, 1)[0]
			container[dragData.parent_index].thresholds.splice(target_index, 0, item as any)
		} else {
			item = container.splice(dragData.index, 1)[0]
			container.splice(target_index, 0, item as any)
		}
		if (["attributes", "resource_tracers"].includes(dragData.type))
			container.forEach((v: any, k: number) => {
				v.order = k
			})

		switch (dragData.type) {
			case "attributes":
			case "attribute_thresholds":
				await this.object.update({ "system.settings.attributes": container })
				return this.render()
			case "resource_trackers":
			case "tracker_thresholds":
				await this.object.update({ "system.settings.resource_trackers": container })
				return this.render()
			case "locations":
				const formData: any = {}
				formData[`array.${path}`] = container
				return this._updateObject(event, formData)
		}

		// Const attributes = this.object.system.attributes
		// const att = attributes.splice(
		// 	attributes.findIndex(e => e.attr_id === dragData.id),
		// 	1
		// )[0]
		// attributes.splice(target_order, 0, att)
		// attributes.forEach((v, k) => {
		// 	v.order = k
		// })

		// await this.object.update({ "system.settings.attributes": attribute_defs, "system.attributes": attributes })
		// this.render()
	}

	close(options?: FormApplication.CloseOptions | undefined): Promise<void> {
		;(this.object.sheet as unknown as CharacterSheetGURPS).config = null
		return super.close(options)
	}
}
