import { ItemSheetGURPS } from "@item/base/sheet";
import { SkillGURPS } from ".";

export class SkillSheet extends ItemSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(["skill"]),
		});
		return options;
	}

	getData(options?: Partial<DocumentSheetOptions> | undefined) {
		const sheetData = {
			...super.getData(options),
			...{
				attributes: {
					...{ 10: "10" },
					...super.getData(options).attributes,
				},
				defaults: (this.item as any).defaults,
			},
		};
		return sheetData;
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html);
	}

	protected _updateObject(event: Event, formData: any): Promise<unknown> {
		const attribute = formData.attribute ?? (this.item as SkillGURPS).attribute;
		const difficulty = formData.difficulty ?? (this.item as SkillGURPS).difficulty;
		formData["system.difficulty"] = `${attribute}/${difficulty}`;
		delete formData.attribute;
		delete formData.difficulty;
		return super._updateObject(event, formData);
	}
}
