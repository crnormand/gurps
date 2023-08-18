import { CharacterSheetConfig } from "@actor/character/config_sheet"
import { Attribute, AttributeObj, AttributeType } from "@module/attribute"
import { SYSTEM_NAME } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { LocalizeGURPS } from "@util"
import { Mook } from "./document"

class MookGeneratorSheet extends FormApplication {
	config: CharacterSheetConfig | null = null

	object: Mook

	constructor(options?: Partial<ApplicationOptions>) {
		super(options)
		this.object = new Mook()
			; (game as any).mook = this.object
	}

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			popOut: true,
			minimizable: true,
			resizable: false,
			width: 800,
			height: 960,
			template: `systems/${SYSTEM_NAME}/templates/mook-generator/sheet.hbs`,
			classes: ["mook-generator", "gurps"],
			closeOnSubmit: false,
			submitOnChange: true,
			submitOnClose: true,
		})
	}

	get title(): string {
		return LocalizeGURPS.translations.gurps.system.mook_generator.title
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		// activateTextareaListeners(html)
	}

	static async init(): Promise<unknown> {
		// const attributes = game.settings.get(
		// 	SYSTEM_NAME,
		// 	`${SETTINGS.DEFAULT_ATTRIBUTES}.attributes`
		// ) as AttributeDefObj[]
		// const trackers = game.settings.get(
		// 	SYSTEM_NAME,
		// 	`${SETTINGS.DEFAULT_RESOURCE_TRACKERS}.resource_trackers`
		// ) as ResourceTrackerDefObj[]
		// const locations = {
		// 	name: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.name`) as string,
		// 	roll: new DiceGURPS(game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.roll`) as string),
		// 	locations: game.settings.get(
		// 		SYSTEM_NAME,
		// 		`${SETTINGS.DEFAULT_HIT_LOCATIONS}.locations`
		// 	) as HitLocationData[],
		// }
		// const settings = {
		// 	settings: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_SHEET_SETTINGS}.settings`) as any,
		// 	tech_level: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_SHEET_SETTINGS}.tech_level`) as string,
		// }

		// const mookActor = await Actor.create({
		// 	_id: randomID(),
		// 	flags: {
		// 		core: {
		// 			sheetClass: `${SYSTEM_NAME}.MookGeneratorSheet`,
		// 		},
		// 	},
		// 	name: LocalizeGURPS.translations.gurps.system.mook_generator.name,
		// 	type: ActorType.Character,
		// 	system: {
		// 		version: 4,
		// 		settings: {
		// 			attributes: attributes,
		// 			resource_trackers: trackers,
		// 			body_type: locations,
		// 			...settings.settings,
		// 		},
		// 		profile: mergeObject(SETTINGS_TEMP.general.auto_fill, {
		// 			name: LocalizeGURPS.translations.gurps.system.mook_generator.name,
		// 			player_name: game.user.name!,
		// 			tech_level: settings.tech_level,
		// 		}),
		// 	},
		// } as any)

		// return mookActor?.sheet?.render(true)
		const mg = new MookGeneratorSheet()
		return mg.render(true)
	}

	getData(options?: Partial<ApplicationOptions> | undefined): MaybePromise<object> {
		console.log("refresh")
		// const actorData = this.actor.toObject(false) as any
		const [primary_attributes, secondary_attributes, point_pools] = this.prepareAttributes(this.object.attributes)
		// const resource_trackers = Array.from(this.actor.resource_trackers.values())

		return mergeObject(super.getData(options), {
			actor: this.object,
			// actor: this.actor,
			// system: actorData.system,
			primary_attributes,
			secondary_attributes,
			point_pools,
			// resource_trackers,
		})
	}

	prepareAttributes(attributes: Map<string, Attribute>): [Attribute[], Attribute[], Attribute[]] {
		const primary_attributes: Attribute[] = []
		const secondary_attributes: Attribute[] = []
		const point_pools: Attribute[] = []
		if (attributes)
			attributes.forEach(a => {
				if ([AttributeType.Pool, AttributeType.PoolSeparator].includes(a.attribute_def?.type))
					point_pools.push(a)
				else if (a.attribute_def?.isPrimary) primary_attributes.push(a)
				else secondary_attributes.push(a)
			})
		return [primary_attributes, secondary_attributes, point_pools]
	}

	protected override _getHeaderButtons(): Application.HeaderButton[] {
		const buttons: Application.HeaderButton[] = [
			// {
			// 	label: "",
			// 	class: "gmenu",
			// 	icon: "gcs-all-seeing-eye",
			// 	onclick: event => this._openGMenu(event),
			// },
		]
		const all_buttons = super._getHeaderButtons()
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-circled-x"
		return [...buttons, all_buttons.at(-1)!]
	}

	// protected async _openGMenu(event: JQuery.ClickEvent) {
	// 	event.preventDefault()
	// 	this.config ??= new CharacterSheetConfig(this.actor as CharacterGURPS, {
	// 		top: this.position.top! + 40,
	// 		left: this.position.left! + (this.position.width! - DocumentSheet.defaultOptions.width!) / 2,
	// 	})
	// 	this.config.render(true)
	// }
	//

	protected async _updateObject(_event: Event, formData: any): Promise<unknown> {
		for (const i of Object.keys(formData)) {
			if (i.startsWith("attributes.")) {
				const attributes: AttributeObj[] =
					(formData["system.attributes"] as AttributeObj[]) ?? duplicate(this.object.system.attributes)
				const id = i.split(".")[1]
				const att = this.object.attributes.get(id)
				if (att) {
					if (i.endsWith(".adj")) (formData[i] as number) -= att.max - att.adj
					if (i.endsWith(".damage")) (formData[i] as number) = Math.max(att.max - (formData[i] as number), 0)
				}
				const key = i.replace(`attributes.${id}.`, "")
				const index = attributes.findIndex(e => e.attr_id === id)
				setProperty(attributes[index], key, formData[i])
				formData["system.attributes"] = attributes
				delete formData[i]
			}
			if (i === "thrust") formData.thrust = new DiceGURPS(formData.thrust)
			if (i === "swing") formData.swing = new DiceGURPS(formData.swing)
		}
		console.log("update", formData)
		return this.object.update(formData)
	}
}

interface MookGeneratorSheet extends FormApplication {
	object: Mook
}

export { MookGeneratorSheet }
