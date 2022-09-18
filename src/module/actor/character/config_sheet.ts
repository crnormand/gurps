import { SYSTEM_NAME } from "@module/settings";
import { CharacterGURPS } from ".";

export class CharacterSheetConfig extends FormApplication {
	object: CharacterGURPS;

	constructor(object: CharacterGURPS, options?: any) {
		super(object, options);
		this.object = object;
	}

	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["form", "character-config", "gcs"],
			template: `systems/${SYSTEM_NAME}/templates/actor/character/config.hbs`,
			width: 400,
		});
	}

	get title() {
		return `${this.object.name}: Character Configuration`;
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): any {
		const actor = this.object;

		return {
			options: options,
			actor: actor.toObject(),
			attributes: actor.system.settings.attributes,
			locations: actor.system.settings.body_type,
		};
	}

	protected _getHeaderButtons(): Application.HeaderButton[] {
		const all_buttons = super._getHeaderButtons();
		all_buttons.at(-1)!.label = "";
		all_buttons.at(-1)!.icon = "gcs-circled-x";
		return all_buttons;
	}

	protected _updateObject(event: Event, formData?: object | undefined): Promise<unknown> {
		throw new Error("Function not yet implemented");
	}
}
