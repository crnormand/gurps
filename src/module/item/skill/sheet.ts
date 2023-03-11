import { ItemSheetGCS } from "@item/gcs"
import { SkillGURPS } from "."

export class SkillSheet extends ItemSheetGCS {
	static get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["skill"]),
		})
		return options
	}

	getData(options?: Partial<DocumentSheetOptions<Item>> | undefined) {
		const data = super.getData(options)
		return mergeObject(data, {
			attributes: {
				...{ 10: "10" },
				...super.getData(options).attributes,
			},
			defaults: (this.item as any).defaults,
		})
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
	}

	protected _updateObject(event: Event, formData: any): Promise<unknown> {
		const attribute = formData.attribute ?? this.item.attribute
		const difficulty = formData.difficulty ?? this.item.difficulty
		formData["system.difficulty"] = `${attribute}/${difficulty}`
		delete formData.attribute
		delete formData.difficulty
		return super._updateObject(event, formData)
	}
}

export interface SkillSheet extends ItemSheetGCS {
	object: SkillGURPS
}
