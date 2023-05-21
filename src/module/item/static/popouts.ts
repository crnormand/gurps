import { SYSTEM_NAME } from "@module/data"
import { StaticItemGURPS } from "./document"

export class StaticPopout extends FormApplication {
	object: StaticItemGURPS

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			classes: ["form", "gurps"],
			width: 620,
			min_width: 620,
			height: 800,
			resizable: true,
			submitOnChange: true,
			submitOnClose: true,
			closeOnSubmit: false,
		})
	}

	constructor(object: StaticItemGURPS, options?: any) {
		super(object, options)
		this.object = object
	}

	protected async _updateObject(_event: Event, formData?: any | undefined): Promise<unknown> {
		if (!this.object.id) return
		await this.object.update(formData)
		return this.render()
	}
}

export class StaticMeleePopout extends StaticPopout {
	get template(): string {
		return `systems/${SYSTEM_NAME}/templates/item/legacy_equipment/popouts/melee.hbs`
	}
}
export class StaticRangedPopout extends StaticPopout {
	get template(): string {
		return `systems/${SYSTEM_NAME}/templates/item/legacy_equipment/popouts/ranged.hbs`
	}
}
export class StaticTraitPopout extends StaticPopout {
	get template(): string {
		return `systems/${SYSTEM_NAME}/templates/item/legacy_equipment/popouts/trait.hbs`
	}
}
export class StaticSkillPopout extends StaticPopout {
	get template(): string {
		return `systems/${SYSTEM_NAME}/templates/item/legacy_equipment/popouts/skill.hbs`
	}
}
export class StaticSpellpopout extends StaticPopout {
	get template(): string {
		return `systems/${SYSTEM_NAME}/templates/item/legacy_equipment/popouts/spell.hbs`
	}
}
