import { ActorSheetGURPS, CharacterGURPS } from "@actor"
import { CharacterSheetConfig } from "@actor/character/config_sheet"
import { HitLocationData } from "@actor/character/hit_location"
import { Attribute, AttributeDefObj, AttributeType } from "@module/attribute"
import { ActorType, SETTINGS, SYSTEM_NAME } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { ResourceTrackerDefObj } from "@module/resource_tracker"
import { SETTINGS_TEMP } from "@module/settings"
import { LocalizeGURPS } from "@util"

class MookGeneratorSheet extends ActorSheetGURPS {
	config: CharacterSheetConfig | null = null

	// constructor(options?: Partial<ApplicationOptions>) {
	// 	super(options)

	// }

	static get defaultOptions(): ActorSheet.Options {
		return mergeObject(super.defaultOptions, {
			popOut: true,
			minimizable: true,
			resizable: true,
			width: 800,
			height: 800,
			template: `systems/${SYSTEM_NAME}/templates/mook-generator/sheet.hbs`,
			classes: ["mook-generator", "gurps"],
		})
	}

	get title(): string {
		return LocalizeGURPS.translations.gurps.system.mook_generator.title
	}

	static async init(): Promise<unknown> {
		const attributes = game.settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_ATTRIBUTES}.attributes`
		) as AttributeDefObj[]
		const trackers = game.settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_RESOURCE_TRACKERS}.resource_trackers`
		) as ResourceTrackerDefObj[]
		const locations = {
			name: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.name`) as string,
			roll: new DiceGURPS(game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.roll`) as string),
			locations: game.settings.get(
				SYSTEM_NAME,
				`${SETTINGS.DEFAULT_HIT_LOCATIONS}.locations`
			) as HitLocationData[],
		}
		const settings = {
			settings: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_SHEET_SETTINGS}.settings`) as any,
			tech_level: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_SHEET_SETTINGS}.tech_level`) as string,
		}

		const mookActor = await Actor.create({
			_id: randomID(),
			flags: {
				core: {
					sheetClass: `${SYSTEM_NAME}.MookGeneratorSheet`,
				},
			},
			name: LocalizeGURPS.translations.gurps.system.mook_generator.name,
			type: ActorType.Character,
			system: {
				version: 4,
				settings: {
					attributes: attributes,
					resource_trackers: trackers,
					body_type: locations,
					...settings.settings,
				},
				profile: mergeObject(SETTINGS_TEMP.general.auto_fill, {
					name: LocalizeGURPS.translations.gurps.system.mook_generator.name,
					player_name: game.user.name!,
					tech_level: settings.tech_level,
				}),
			},
		} as any)

		;(game as any).mook = mookActor
		return mookActor?.sheet?.render(true)
		// const mg = new MookGeneratorSheet()
		// return mg.render(true)
	}

	getData(options?: Partial<ApplicationOptions> | undefined): MaybePromise<object> {
		console.log("refresh")
		const actorData = this.actor.toObject(false) as any
		const [primary_attributes, secondary_attributes, point_pools] = this.prepareAttributes(this.actor.attributes)
		const resource_trackers = Array.from(this.actor.resource_trackers.values())

		return mergeObject(super.getData(options), {
			actor: this.actor,
			system: actorData.system,
			primary_attributes,
			secondary_attributes,
			point_pools,
			resource_trackers,
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
			{
				label: "",
				class: "gmenu",
				icon: "gcs-all-seeing-eye",
				onclick: event => this._openGMenu(event),
			},
		]
		const all_buttons = super._getHeaderButtons()
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-circled-x"
		return [...buttons, all_buttons.at(-1)!]
	}

	protected async _openGMenu(event: JQuery.ClickEvent) {
		event.preventDefault()
		this.config ??= new CharacterSheetConfig(this.actor as CharacterGURPS, {
			top: this.position.top! + 40,
			left: this.position.left! + (this.position.width! - DocumentSheet.defaultOptions.width!) / 2,
		})
		this.config.render(true)
	}

	protected _updateObject(event: Event, formData: object): Promise<unknown> {
		console.log("update")
		return super._updateObject(event, formData)
	}
}

interface MookGeneratorSheet extends ActorSheetGURPS {
	object: CharacterGURPS
}

export { MookGeneratorSheet }
