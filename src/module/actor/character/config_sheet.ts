import { AttributeDef, AttributeDefObj } from "@module/attribute/attribute_def"
import { SYSTEM_NAME } from "@module/settings"
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
			submitOnChange: true,
			closeOnSubmit: false,
			tabs: [
				{
					navSelector: "nav",
					contentSelector: "section.content",
					initital: "sheet-settings",
				},
			],
			dragDrop: [{ dragSelector: ".item-list .item .controls .drag", dropSelector: null }],
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
		// Const primaryAttributes = new Map(Object.entries(actor.settings.attributes).filter(([k, _v]) => actor.primaryAttributes(true).has(k)))
		// const secondaryAttributes = new Map(Object.entries(actor.settings.attributes).filter(([k, _v]) => actor.secondaryAttributes(true).has(k)))
		// const poolAttributes = new Map(Object.entries(actor.settings.attributes).filter(([k, _v]) => actor.poolAttributes(true).has(k)))
		// primaryAttributes.forEach((e: AttributeDef): void => { e.order = actor.attributes.get(e.id)?.order || 0 })
		// secondaryAttributes.forEach((e: AttributeDef): void => { e.order = actor.attributes.get(e.id)?.order || 0 })
		// poolAttributes.forEach((e: AttributeDef): void => { e.order = actor.attributes.get(e.id)?.order || 0 })

		return {
			options: options,
			actor: actor.toObject(),
			system: actor.system,
			// Attributes: actor.system.settings.attributes,
			primaryAttributes: primaryAttributes,
			secondaryAttributes: secondaryAttributes,
			poolAttributes: poolAttributes,
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
		html.find("input[type='file']").on("change", event => {
			const filename = String($(event.currentTarget).val()).split("\\").pop() || ""
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
		html.find(".import-confirm").on("click", event => this._import(event))
		html.find("textarea")
			.each(function () {
				const height = this.scrollHeight
				this.setAttribute("style", `height:${height}px;`)
			})
			.on("input", function () {
				const height = this.scrollHeight
				// Const height = this.value.split("\r").length * 24;
				this.style.height = "0"
				this.style.height = `${height}px`
			})

		html.find(".item").on("dragover", event => this._onDragItem(event))
	}

	protected async _reimport(event: JQuery.ClickEvent) {
		event.preventDefault()
		const import_path = this.object.importData.path
		const import_name = import_path.match(/.*[/\\]Data[/\\](.*)/)!
		const file_path = import_name[1].replace(/\\/g, "/")
		const request = new XMLHttpRequest()
		request.open("GET", file_path)

		new Promise(resolve => {
			request.onload = () => {
				if (request.status === 200) {
					const text = request.response
					CharacterImporter.import(this.object, {
						text: text,
						name: import_name[1],
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
		const all_buttons = super._getHeaderButtons()
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-circled-x"
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
				const attributes: AttributeDefObj[] =
					(formData["system.settings.attributes"] as AttributeDefObj[]) ??
					this.object.system.settings.attributes
				const id = i.split(".")[1]
				const key = i.replace(`attributes.${id}.`, "")
				const index = attributes.findIndex(e => e.id === id)
				setProperty(attributes[index], key, formData[i])
				formData["system.settings.attributes"] = attributes
				delete formData[i]
			}
		}

		return this.object.update(formData)
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
		;(this.object.sheet as unknown as CharacterSheetGURPS).config = null
		return super.close(options)
	}
}
