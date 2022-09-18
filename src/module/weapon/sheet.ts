import { CharacterGURPS } from "@actor";
import { ItemGURPS } from "@item";
import { DiceGURPS } from "@module/dice";
import { SYSTEM_NAME } from "@module/settings";
import { i18n, toArray } from "@util";
import { Weapon } from ".";

export class WeaponSheet extends FormApplication {
	constructor(object: ItemGURPS, index: number, options: any = {}) {
		super(object, options);
		this.index = index;
		this.weapon = (object.system as any).weapons[index];
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html);
		html.find("#defaults .add").on("click", event => this._addDefault(event));
		html.find(".default .remove").on("click", event => this._removeDefault(event));
		html.find("span.input").on("blur", event => this._onSubmit(event as any));
	}

	get template(): string {
		return `systems/${SYSTEM_NAME}/templates/item/${this.weapon.type.replaceAll("_", "-")}.hbs`;
	}

	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["form", "melee-weapon", "gcs", "item"],
			width: 420,
			resizable: true,
			submitOnChange: true,
			submitOnClose: true,
			closeOnSubmit: false,
			popOut: true,
		});
	}

	get title(): string {
		return `${this.object.name} - ${this.weapon.usage || `${i18n("gurps.weapon.usage")} ${this.index}`}`;
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): any {
		const attributes: Record<string, string> = {};
		if (this.object.actor) {
			const actor = this.object.actor as unknown as CharacterGURPS;
			for (const e of Object.values(actor.attributes)) {
				attributes[e.attr_id] = e.attribute_def.name;
			}
		} else {
			mergeObject(attributes, {
				st: "ST",
				dx: "DX",
				iq: "IQ",
				ht: "HT",
				will: "Will",
				fright_check: "Fright Check",
				per: "Perception",
				vision: "Vision",
				hearing: "Hearing",
				taste_smell: "Taste & Smell",
				touch: "Touch",
				basic_speed: "Basic Speed",
				basic_move: "Basic Move",
				fp: "FP",
				hp: "HP",
			});
		}
		return {
			...super.getData(options),
			weapon: this.weapon,
			config: (CONFIG as any).GURPS,
			attributes: attributes,
			sysPrefix: "",
		};
	}

	protected _getHeaderButtons(): Application.HeaderButton[] {
		const all_buttons = super._getHeaderButtons();
		all_buttons.at(-1)!.label = "";
		all_buttons.at(-1)!.icon = "gcs-circled-x";
		return all_buttons;
	}

	protected _updateObject(event: Event, formData: DocumentSheetConfig.FormData | any): Promise<any> {
		formData["damage.base"] = new DiceGURPS(formData["damage.base"] as string).stringExtra(false);

		const weaponList: Weapon[] = toArray(duplicate(getProperty(this.object, "system.weapons")));
		for (const [k, v] of Object.entries(formData)) {
			// HACK: values of 0 are replaced with empty strings. this fixes it, but it's messy
			if (k.startsWith("NUMBER.")) {
				formData[k.replace("NUMBER.", "")] = parseFloat(`${v}`);
				delete formData[k];
			}
		}
		for (const [k, v] of Object.entries(formData)) {
			setProperty(weaponList[this.index], k, v);
		}

		return this.object.update({ "system.weapons": weaponList });
	}

	protected async _addDefault(event: JQuery.ClickEvent): Promise<any> {
		console.log("_removeDefault", event);
		const weapons = toArray(duplicate(getProperty(this.object, "system.weapons")));
		const defaults = toArray(duplicate(getProperty(this.weapon, "defaults")));
		console.log(weapons, defaults);
		defaults.push({
			type: "skill",
			name: "",
			specialization: "",
			modifier: 0,
		});
		const update: any = {};
		this.weapon.defaults = defaults;
		weapons[this.index] = { ...this.weapon };
		console.log(weapons);
		update["system.weapons"] = weapons;
		await this.object.update(update);
		return this.render(false, { action: "update", data: update } as any);
	}

	protected async _removeDefault(event: JQuery.ClickEvent): Promise<any> {
		console.log("_removeDefault", event);
		const index = $(event.currentTarget).data("index");
		const weapons = toArray(duplicate(getProperty(this.object, "system.weapons")));
		const defaults = toArray(duplicate(getProperty(this.weapon, "defaults")));
		console.log(index, weapons, defaults);
		defaults.splice(index, 1);
		const update: any = {};
		this.weapon.defaults = defaults;
		weapons[this.index] = { ...this.weapon };
		console.log(weapons);
		update["system.weapons"] = weapons;
		await this.object.update(update);
		return this.render(false, { action: "update", data: update } as any);
	}
}

export interface WeaponSheet extends FormApplication {
	object: ItemGURPS;
	index: number;
	weapon: Weapon;
}
