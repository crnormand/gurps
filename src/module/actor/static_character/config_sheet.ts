import { SETTINGS, SYSTEM_NAME } from "@module/settings"
import { i18n_f } from "@util"
import { StaticCharacterGURPS } from "."
import { StaticResourceTracker, StaticThresholdComparison, StaticThresholdOperator } from "./data"
import { StaticCharacterImporter } from "./import"

export class StaticCharacterSheetConfig extends FormApplication {
	object: StaticCharacterGURPS

	filename: string

	file?: { text: string; name: string; path: string }

	resource_trackers: { [key: string]: StaticResourceTracker }

	constructor(object: StaticCharacterGURPS, options?: any) {
		super(object, options)
		this.object = object
		this.filename = ""
		this.resource_trackers = this.object.system.additionalresources.tracker
	}

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			classes: ["form", "character-config", "gurps"],
			template: `systems/${SYSTEM_NAME}/templates/actor/static_character/config/config.hbs`,
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
		})
	}

	get title() {
		return i18n_f("gurps.character.settings.header", { name: this.object.name })
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		html.find(".add").on("click", event => this._onAddItem(event))
		html.find(".quick-import").on("click", event => this._reimport(event))
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
	}

	protected async _import(event: JQuery.ClickEvent) {
		event.preventDefault()
		if (this.file) {
			const file = this.file
			this.file = undefined
			this.filename = ""
			StaticCharacterImporter.import(this.object, file)
		}
	}

	protected async _reimport(event: JQuery.ClickEvent) {
		event.preventDefault()
		const import_path = this.object.system.additionalresources.importpath
		const import_name = import_path.match(/.*[/\\]Data[/\\](.*)/)
		const file_path = import_name?.[1].replace(/\\/g, "/") || this.object.system.additionalresources.importpath
		const request = new XMLHttpRequest()
		request.open("GET", file_path)

		new Promise(resolve => {
			request.onload = () => {
				if (request.status === 200) {
					const text = request.response
					StaticCharacterImporter.import(this.object, {
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

	async _onAddItem(event: JQuery.ClickEvent) {
		event.preventDefault()
		event.stopPropagation()
		const type:
			| "resource_trackers"
			| "tracker_thresholds" = $(event.currentTarget).data("type")
		const resource_trackers = Object.values(this.resource_trackers)
		let updated_trackers: any = {}
		switch (type) {
			case "resource_trackers":
				resource_trackers.push({
					alias: "",
					name: "",
					max: 0,
					isMaxEnforced: false,
					min: 0,
					isMinEnforced: false,
					isDamageTracker: false,
					isDamageType: false,
					pdf: "",
					initialValue: 0,
					value: 0,
					points: 0,

					thresholds: [],
				})
				updated_trackers = resource_trackers.reduce((a, v, k) => ({
					...a, [String(k).padStart(5, "0")]: v
				}), {})
				await this.object.update({ "system.additionalresources.tracker": updated_trackers })
				return this.render()
			case "tracker_thresholds":
				resource_trackers[parseInt($(event.currentTarget).data("id"))].thresholds ??= []
				resource_trackers[parseInt($(event.currentTarget).data("id"))].thresholds!.push({
					color: "#ffffff",
					comparison: StaticThresholdComparison.LessThan,
					operator: StaticThresholdOperator.Add,
					value: 0,
					condition: ""
				})
				updated_trackers = resource_trackers.reduce((a, v, k) => ({
					...a, [String(k).padStart(5, "0")]: v
				}), {})
				await this.object.update({ "system.additionalresources.tracker": updated_trackers })
				return this.render()
		}
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): any {
		const actor = this.object
		this.resource_trackers = this.object.system.additionalresources.tracker
		const resourceTrackers = actor.trackers
		let deprecation: string = this.object.getFlag(SYSTEM_NAME, "deprecation_acknowledged")
			? "acknowledged"
			: "manual"
		// Don't show deprecation warning if character is not imported
		if (deprecation === "manual") {
			if (this.object.system.additionalresources.importpath.includes(".gcs")) deprecation = "easy"
			if (this.object.system.additionalresources.importpath.includes(".gca5")) deprecation = "easy"
		}

		return {
			options: options,
			actor: actor.toObject(),
			system: actor.system,
			resourceTrackers: resourceTrackers,

			filename: this.filename,
			config: (CONFIG as any).GURPS,
		}
	}

	protected async _updateObject(event: Event, formData?: any | undefined): Promise<unknown> {
		return this.render()
	}
}
