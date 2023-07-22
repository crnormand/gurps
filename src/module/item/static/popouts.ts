import { SYSTEM_NAME } from "@module/data"
import { StaticItemGURPS } from "./document"

export enum StaticPopoutType {
	Melee = "melee",
	Ranged = "ranged",
	Spell = "spells",
	Trait = "ads",
	Skill = "skills",
}

export class StaticPopout extends FormApplication {
	object!: StaticItemGURPS

	key!: StaticPopoutType

	uuid!: string

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			classes: ["form", "gurps", "item"],
			width: 620,
			min_width: 620,
			height: 800,
			resizable: true,
			submitOnChange: true,
			submitOnClose: true,
			closeOnSubmit: false,
		})
	}

	get title(): string {
		switch (this.key) {
			case StaticPopoutType.Melee:
			case StaticPopoutType.Ranged:
				return this.object.system[this.key][this.uuid].mode
			case StaticPopoutType.Skill:
			case StaticPopoutType.Trait:
			case StaticPopoutType.Spell:
				return this.object.system[this.key][this.uuid].name
			default:
				return ""
		}
	}

	constructor(object: StaticItemGURPS, key: StaticPopoutType, uuid: string, options?: any) {
		options ??= {}
		if (options.ready && options.ready === true) {
			super(object)
			this.object = object
			this.key = key
			this.uuid = uuid
		} else {
			mergeObject(options, { ready: true })
			switch (key) {
				case StaticPopoutType.Melee:
					return new StaticMeleePopout(object, key, uuid, options)
				case StaticPopoutType.Ranged:
					return new StaticRangedPopout(object, key, uuid, options)
				case StaticPopoutType.Spell:
					return new StaticSpellPopout(object, key, uuid, options)
				case StaticPopoutType.Trait:
					return new StaticTraitPopout(object, key, uuid, options)
				case StaticPopoutType.Skill:
					return new StaticSkillPopout(object, key, uuid, options)
				default:
					return new StaticPopout(object, key, uuid, options)
			}
		}
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): MaybePromise<object> {
		return mergeObject(super.getData(options), {
			list: this.key,
			key: this.uuid,
			data: (this.object.system[this.key] as any)[this.uuid],
		})
	}

	protected async _updateObject(_event: Event, formData?: any | undefined): Promise<unknown> {
		if (!this.object.uuid) return
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
