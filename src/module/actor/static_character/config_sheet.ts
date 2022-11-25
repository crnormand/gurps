import { SYSTEM_NAME } from "@module/settings"
import { i18n_f } from "@util"
import { StaticCharacterGURPS } from "."
import { StaticResourceTracker } from "./data"

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
		})
	}

	get title() {
		return i18n_f("gurps.character.settings.header", { name: this.object.name })
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): any {
		const actor = this.object
		this.resource_trackers = this.object.system.additionalresources.tracker
		const resourceTrackers = actor.trackers

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
