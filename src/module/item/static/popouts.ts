import { _BaseComponent } from "@actor/static_character/components"
import { SYSTEM_NAME } from "@module/data"
import { StaticItemSystemData } from "./data"
import { StaticItemGURPS } from "./document"

export class StaticPopout extends FormApplication {
	object!: StaticItemGURPS

	key!: keyof StaticItemSystemData

	uuid!: string

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

	constructor(object: StaticItemGURPS, key: keyof StaticItemSystemData, uuid: string, options?: any) {
		options ??= {}
		if (options.ready && options.ready === true) {
			super(object)
			this.object = object
			this.key = key
			this.uuid = uuid
		} else {
			mergeObject(options, { ready: true })
			switch (key) {
				case "melee":
					return new StaticMeleePopout(object, key, uuid, options)
				case "ranged":
					return new StaticRangedPopout(object, key, uuid, options)
				case "spells":
					return new StaticSpellPopout(object, key, uuid, options)
				case "ads":
					return new StaticTraitPopout(object, key, uuid, options)
				case "skills":
					return new StaticSkillPopout(object, key, uuid, options)
				default:
					return new StaticPopout(object, key, uuid, options)
			}
		}
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): MaybePromise<object> {
		return mergeObject(super.getData(options), {
			key: this.uuid,
			data: (this.object.system[this.key] as any)[this.uuid],
		})
	}

	protected async _updateObject(_event: Event, formData?: any | undefined): Promise<unknown> {
		if (!this.object.uuid) return
		console.log(formData)
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
export class StaticSpellPopout extends StaticPopout {
	get template(): string {
		return `systems/${SYSTEM_NAME}/templates/item/legacy_equipment/popouts/spell.hbs`
	}
}
