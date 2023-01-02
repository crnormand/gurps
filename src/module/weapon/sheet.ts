import { CharacterGURPS } from "@actor"
import { ItemGURPS } from "@item"
import { Attribute } from "@module/attribute"
import { gid, SETTINGS, SYSTEM_NAME } from "@module/data"
import { SkillDefault } from "@module/default"
import { DiceGURPS } from "@module/dice"
import { i18n } from "@util"
import { Weapon } from "."

export class WeaponSheet extends FormApplication {
	constructor(object: ItemGURPS, uuid: string, options: any = {}) {
		super(object, options)
		this.uuid = uuid
		this.weapon = object.weapons.get(this.uuid)!
		this.index = this.weapon.index
		this.weapon = (object.system as any).weapons[this.index]
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find("#defaults .add").on("click", event => this._addDefault(event))
		html.find(".default .remove").on("click", event => this._removeDefault(event))
		html.find("span.input").on("blur", event => this._onSubmit(event as any))
	}

	get template(): string {
		return `systems/${SYSTEM_NAME}/templates/item/${this.weapon.type.replaceAll("_", "-")}.hbs`
	}

	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["form", "melee-weapon", "gurps", "item"],
			width: 420,
			resizable: true,
			submitOnChange: true,
			submitOnClose: true,
			closeOnSubmit: false,
			popOut: true,
		})
	}

	get title(): string {
		return `${this.object.name} - ${this.weapon.usage || `${i18n("gurps.weapon.usage")} ${this.index}`}`
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): any {
		const attributes: Record<string, string> = {}
		const defaultAttributes = (game as Game).settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_ATTRIBUTES}.attributes`
		) as Attribute[]
		if (this.object.actor) {
			const actor = this.object.actor as unknown as CharacterGURPS
			for (const e of Object.values(actor.attributes)) {
				attributes[e.attr_id] = e.attribute_def.name
			}
		} else {
			mergeObject(
				attributes,
				defaultAttributes.reduce(function (map: any, obj: any) {
					map[obj.id] = obj.name
					return map
				}, {})
			)
		}
		return {
			...super.getData(options),
			weapon: this.weapon,
			config: (CONFIG as any).GURPS,
			attributes: attributes,
			sysPrefix: "",
		}
	}

	protected _getHeaderButtons(): Application.HeaderButton[] {
		const all_buttons = super._getHeaderButtons()
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-circled-x"
		return all_buttons
	}

	protected _updateObject(_event: Event, formData: DocumentSheetConfig.FormData | any): Promise<any> {
		// FormData = FormApplicationGURPS.updateObject(event, formData)
		formData["damage.base"] = new DiceGURPS(formData["damage.base"] as string).stringExtra(false)

		const weaponList: Weapon[] = (this.object.system as any).weapons
		for (const [k, v] of Object.entries(formData)) {
			setProperty(weaponList[this.index], k, v)
		}

		return this.object.update({ "system.weapons": weaponList })
	}

	protected async _addDefault(_event: JQuery.ClickEvent): Promise<any> {
		const weapons: Partial<Weapon>[] = (this.object.system as any).weapons
		const defaults: Partial<SkillDefault>[] = this.weapon.defaults
		defaults.push({
			type: gid.Skill,
			name: "",
			specialization: "",
			modifier: 0,
		})
		const update: any = {}
		;(this.weapon as any).defaults = defaults
		weapons[this.index] = { ...this.weapon }
		update["system.weapons"] = weapons
		await this.object.update(update)
		return this.render(false, { action: "update", data: update } as any)
	}

	protected async _removeDefault(event: JQuery.ClickEvent): Promise<any> {
		const index = $(event.currentTarget).data("index")
		const weapons: Partial<Weapon>[] = (this.object.system as any).weapons
		const defaults: Partial<SkillDefault>[] = this.weapon.defaults
		defaults.splice(index, 1)
		const update: any = {}
		;(this.weapon as any).defaults = defaults
		weapons[this.index] = { ...this.weapon }
		update["system.weapons"] = weapons
		await this.object.update(update)
		return this.render(false, { action: "update", data: update } as any)
	}
}

export interface WeaponSheet extends FormApplication {
	object: ItemGURPS
	uuid: string
	weapon: Weapon
	index: number
}
