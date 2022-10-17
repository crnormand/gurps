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
		})
	}

	get title() {
		return `${this.object.name}: Character Configuration`
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): any {
		const actor = this.object

		return {
			options: options,
			actor: actor.toObject(),
			system: actor.system,
			// Attributes: actor.system.settings.attributes,
			primaryAttributes: Object.fromEntries(
				Object.entries(actor.settings.attributes).filter(([k, _v]) => actor.primaryAttributes(true).has(k))
			),
			secondaryAttributes: Object.fromEntries(
				Object.entries(actor.settings.attributes).filter(([k, _v]) => actor.secondaryAttributes(true).has(k))
			),
			poolAttributes: Object.fromEntries(
				Object.entries(actor.settings.attributes).filter(([k, _v]) => actor.poolAttributes(true).has(k))
			),
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

	protected async _updateObject(event: Event, formData?: any | undefined): Promise<unknown> {
		if (!this.object.id) return
		if (formData["system.settings.block_layout"])
			formData["system.settings.block_layout"] = formData["system.settings.block_layout"].split("\n")
		return this.object.update(formData)
	}

	close(options?: FormApplication.CloseOptions | undefined): Promise<void> {
		;(this.object.sheet as unknown as CharacterSheetGURPS).config = null
		return super.close(options)
	}
}
