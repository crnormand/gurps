import { AttributeDef, AttributeDefObj, AttributeType } from "@module/attribute/attribute_def"
import { ThresholdOp } from "@module/attribute/pool_threshold"
import { ResourceTrackerDef, ResourceTrackerDefObj } from "@module/resource_tracker/tracker_def"
import { SETTINGS, SYSTEM_NAME } from "@module/settings"
import { CharacterGURPS } from "."
import { CharacterImporter } from "./import"
import { CharacterSheetGURPS } from "./sheet"

export class CharacterSheetConfig extends FormApplication {
	object: CharacterGURPS

	filename: string

	file?: { text: string; name: string; path: string }

	constructor(object: CharacterGURPS, options?: any) {
		super(object, options)
		this.object = object
		this.filename = ""
	}

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			classes: ["form", "character-config", "gurps"],
			template: `systems/${SYSTEM_NAME}/templates/actor/character/config/config.hbs`,
			width: 450,
			resizable: true,
			submitOnChange: false,
			submitOnClose: false,
			closeOnSubmit: true,
			tabs: [
				{
					navSelector: "nav",
					contentSelector: "section.content",
					initital: "sheet-settings",
				},
			],
			dragDrop: [{ dragSelector: ".item-list .item .controls .drag", dropSelector: null }],
			scrollY: [".item-list"],
		})
	}

	get title() {
		return `${this.object.name}: Character Configuration`
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): any {
		const actor = this.object

		const primaryAttributes = actor.settings.attributes
			.filter(e => actor.primaryAttributes(true).has(e.id))
			.map(e => mergeObject(e, { order: actor.attributes.get(e.id)!.order }))
		const secondaryAttributes = actor.settings.attributes
			.filter(e => actor.secondaryAttributes(true).has(e.id))
			.map(e => mergeObject(e, { order: actor.attributes.get(e.id)!.order }))
		const poolAttributes = actor.settings.attributes
			.filter(e => actor.poolAttributes(true).has(e.id))
			.map(e => mergeObject(e, { order: actor.attributes.get(e.id)!.order }))
		const resourceTrackers = actor.settings.resource_trackers

		return {
			options: options,
			actor: actor.toObject(),
			system: actor.system,
			// Attributes: actor.system.settings.attributes,
			primaryAttributes: primaryAttributes,
			secondaryAttributes: secondaryAttributes,
			poolAttributes: poolAttributes,
			resourceTrackers: resourceTrackers,
			locations: actor.system.settings.body_type,
			filename: this.filename,
			config: (CONFIG as any).GURPS,
		}
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
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
								if (request.status == 200) {
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
			.each(function() {
				const height = this.scrollHeight
				this.setAttribute("style", `height:${height}px;`)
			})
			.on("input", function() {
				const height = this.scrollHeight
				// Const height = this.value.split("\r").length * 24;
				this.style.height = "0"
				this.style.height = `${height}px`
			})

		html.find(".item").on("dragover", event => this._onDragItem(event))
		html.find(".add").on("click", event => this._onAddItem(event))
	}

	async _onAddItem(event: JQuery.ClickEvent) {
		event.preventDefault()
		event.stopPropagation()
		const type: "attributes" | "resource_trackers" | "attribute_thresholds" | "tracker_thresholds" = $(event.currentTarget).data("type")
		let new_id = ""
		const attributes = this.object.system.settings.attributes || []
		const resource_trackers = this.object.system.settings.resource_trackers || []
		if (type === "attributes" || type === "resource_trackers") for (let n = 0; n < 26; n++) {
			const char = String.fromCharCode(97 + n)
			if (![...attributes, ...resource_trackers].find(e => e.id === char)) {
				new_id = char
				break
			}
		}
		switch (type) {
			case "attributes":
				// TODO: account for possibility of all letters being taken
				attributes.push({
					type: AttributeType.Integer,
					id: new_id,
					name: "",
					attribute_base: "",
					cost_per_point: 0,
					cost_adj_percent_per_sm: 0,
				})
				await this.object.update({ "system.settings.attributes": attributes })
				return this.render()
			case "resource_trackers":
				resource_trackers.push({
					id: new_id,
					name: "",
					full_name: "",
					tracker_base: "",
					max: 0,
					isMaxEnforced: false,
					min: 0,
					isMinEnforced: false,
					order: resource_trackers.length,
					thresholds: [],
				})
				await this.object.update({ "system.settings.resource_trackers": resource_trackers })
				return this.render()
			case "attribute_thresholds":
				attributes[$(event.currentTarget).data("id")].thresholds ??= []
				attributes[$(event.currentTarget).data("id")].thresholds!.push({
					state: "",
					explanation: "",
					expression: "",
					ops: []
				})
				await this.object.update({ "system.settings.attributes": attributes })
				return this.render()
			case "tracker_thresholds":
				resource_trackers[$(event.currentTarget).data("id")].thresholds ??= []
				resource_trackers[$(event.currentTarget).data("id")].thresholds!.push({
					state: "",
					explanation: "",
					expression: "",
					ops: []
				})
				await this.object.update({ "system.settings.resource_trackers": resource_trackers })
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
		if (formData["system.settings.block_layout"])
			formData["system.settings.block_layout"] = formData["system.settings.block_layout"].split("\n")
		// Set values inside system.attributes array, and amend written values based on input
		for (const i of Object.keys(formData)) {
			if (i.startsWith("attributes.")) {
				const attributes: AttributeDef[] =
					(formData["system.settings.attributes"] as AttributeDef[]) ?? this.object.system.settings.attributes
				const index = parseInt(i.split(".")[1])
				const key = i.replace(`attributes.${index}.`, "")
				if (key.startsWith("thresholds.")) {
					const tindex = parseInt(key.split(".")[1])
					const thresholds = attributes[index].thresholds!
					const tkey = key.replace(`thresholds.${tindex}`, "")
					if (tkey.startsWith("halve_")) {
						if (thresholds[tindex].ops!.includes(tkey as ThresholdOp)) {
							thresholds[tindex].ops!.splice(thresholds[tindex].ops!.indexOf(tkey as ThresholdOp), 1)
						} else {
							thresholds[tindex].ops!.push(tkey as ThresholdOp)
						}
					} else {
						setProperty(thresholds[tindex], tkey, formData[i])
					}
					setProperty(attributes[index], "thresholds", thresholds)
				} else {
					setProperty(attributes[index], key, formData[i])
				}
				formData["system.settings.attributes"] = attributes
				delete formData[i]
			}
			if (i.startsWith("resource_trackers.")) {
				const trackers: ResourceTrackerDef[] =
					(formData["system.settings.resource_trackers"] as ResourceTrackerDef[]) ??
					this.object.system.settings.resource_trackers
				const index = parseInt(i.split(".")[1])
				const key = i.replace(`resource_trackers.${index}.`, "")
				if (key.startsWith("thresholds.")) {
					const tindex = parseInt(key.split(".")[1])
					const thresholds = trackers[index].thresholds!
					const tkey = key.replace(`thresholds.${tindex}`, "")
					if (tkey.startsWith("halve_")) {
						if (thresholds[tindex].ops!.includes(tkey as ThresholdOp)) {
							thresholds[tindex].ops!.splice(thresholds[tindex].ops!.indexOf(tkey as ThresholdOp), 1)
						} else {
							thresholds[tindex].ops!.push(tkey as ThresholdOp)
						}
					} else {
						setProperty(thresholds[tindex], tkey, formData[i])
					}
					setProperty(trackers[index], "thresholds", thresholds)
				} else {
					setProperty(trackers[index], key, formData[i])
				}
				formData["system.settings.resource_trackers"] = trackers
				delete formData[i]
			}
		}

		await this.object.update(formData)
		return this.render()
	}

	async _onDragStart(event: DragEvent) {
		const item = event.currentTarget
		const type: "attribute" | "threshold" | "location" = $(item!).data("type")
		if (type === "attribute") {
			const id = $(item!).data("id")
			const order = $(item!).data("order")
			console.log(id, order)
			event.dataTransfer?.setData(
				"text/plain",
				JSON.stringify({
					type: type,
					id: id,
					order: order,
				})
			)
		}

		// Const dragImage = document.createElement("div")
		// dragImage.innerHTML = await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/drag-image.hbs`, {
		// 	name: `${item?.name}`,
		// 	type: `${item?.type.replace("_container", "").replaceAll("_", "-")}`,
		// })
		// dragImage.id = "drag-ghost"
		// document.body.querySelectorAll("#drag-ghost").forEach(e => e.remove())
		// document.body.appendChild(dragImage)
		// const height = (document.body.querySelector("#drag-ghost") as HTMLElement).offsetHeight
		// event.dataTransfer?.setDragImage(dragImage, 0, height / 2)
	}

	protected _onDragItem(event: JQuery.DragOverEvent): void {
		const element = $(event.currentTarget!)
		const heightAcross = (event.pageY! - element.offset()!.top) / element.height()!
		// Console.log(heightAcross)
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
		let dragData = JSON.parse(event.dataTransfer!.getData("text/plain"))
		let element = $(event.target!)
		if (!element.hasClass("item")) element = element.parent(".item")
		const target_id = element.data("id")
		const target_order = element.data("order")
		console.log(dragData, target_id, target_order)
		const above = element.hasClass("border-top")
		if (dragData.order === target_order) return this.render()
		if (above && dragData.order === target_order - 1) return this.render()
		if (!above && dragData.order === target_order + 1) return this.render()

		const attribute_defs = this.object.settings.attributes
		const att_def = attribute_defs.splice(
			attribute_defs.findIndex(e => e.id === dragData.id),
			1
		)[0]
		console.log(`attribute_defs.splice(${target_order}, 0, ${att_def})`)
		attribute_defs.splice(target_order, 0, att_def)
		attribute_defs.forEach((v, k) => {
			v.order = k
		})

		const attributes = this.object.system.attributes
		const att = attributes.splice(
			attributes.findIndex(e => e.attr_id === dragData.id),
			1
		)[0]
		attributes.splice(target_order, 0, att)
		attributes.forEach((v, k) => {
			v.order = k
		})

		await this.object.update({ "system.settings.attributes": attribute_defs, "system.attributes": attributes })
		this.render()
	}

	close(options?: FormApplication.CloseOptions | undefined): Promise<void> {
		; (this.object.sheet as unknown as CharacterSheetGURPS).config = null
		return super.close(options)
	}
}
