import { ActorSheetGURPS } from "@actor/base/sheet"
import { RollType } from "@module/data"
import { SYSTEM_NAME } from "@module/settings"
import { i18n, RollGURPS } from "@util"
import { StaticCharacterGURPS } from "."
import { StaticAttributeName, StaticSecondaryAttributeName } from "./data"

export class StaticCharacterSheetGURPS extends ActorSheetGURPS {
	static get defaultOptions(): ActorSheet.Options {
		return mergeObject(super.defaultOptions, {
			classes: super.defaultOptions.classes.concat(["character", "static"]),
			width: 800,
			height: 800,
			tabs: [{ navSelector: "gurps-sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
			scrollY: [
				".gurpsactorsheet #advantages #reactions #melee #ranged #skills #spells #equipmentcarried #equipmentother #notes",
			],
			dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
		})
	}

	get template(): string {
		if (!(game as Game).user?.isGM && this.actor.limited)
			return `systems${SYSTEM_NAME}/templates/actor/static_character/sheet_limited.hbs`
		return `/systems/${SYSTEM_NAME}/templates/actor/static_character/sheet.hbs`
	}

	getData(options?: Partial<ActorSheet.Options> | undefined): any {
		const actorData = this.actor.toObject(false) as any
		const items = deepClone(
			this.actor.items
				.map(item => item as Item)
				// @ts-ignore until types v10
				.sort((a: Item, b: Item) => (a.sort ?? 0) - (b.sort ?? 0))
		)
		// Const [primary_attributes, secondary_attributes, point_pools] = this.prepareAttributes(this.actor.system.attributes)
		const sheetData = {
			...super.getData(options),
			system: actorData.system,
			// Ranges: Static.rangeObject.ranges,
			// useCI: GURPS.ConditionalInjury.isInUse(),
			// conditionalEffectsTable = GURPS.ConditionalInjury.conditionalEffectsTable(),
			eqtsummary: this.actor.system.eqtsummary,
			isGM: (game as Game).user?.isGM,
			effects: this.actor.getEmbeddedCollection("ActiveEffect").contents,
			// UseQN: (game as Game).settings.get(SYSTEM_NAME, settings.SETTING_USE_QUINTESSENCE),
		}

		return sheetData
	}

	override activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		// Html.find(".input").on("change", event => this._resizeInput(event))
		// html.find(".dropdown-toggle").on("click", event => this._onCollapseToggle(event))
		// html.find(".reference").on("click", event => this._handlePDF(event))
		// html.find(".item").on("dblclick", event => this._openItemSheet(event))
		// html.find(".equipped").on("click", event => this._onEquippedToggle(event))
		html.find(".rollable").on("mouseover", event => this._onRollableHover(event, true))
		html.find(".rollable").on("mouseout", event => this._onRollableHover(event, false))
		html.find(".rollable").on("click", event => this._onClickRoll(event))

		// Hover Over
		// html.find(".item").on("dragleave", event => this._onItemDragLeave(event))
		// html.find(".item").on("dragenter", event => this._onItemDragEnter(event))
	}

	protected async _onClickRoll(event: JQuery.ClickEvent) {
		event.preventDefault()
		if (this.actor.editing) return
		const type: RollType = $(event.currentTarget).data("type")
		const data: { [key: string]: any } = { type: type }
		if (type === RollType.Attribute) {
			const attribute = {
				current: 0,
				attribute_def: {
					combinedName: "",
				},
			}
			if (
				["frightcheck", "vision", "hearing", "tastesmell", "touch"].includes($(event.currentTarget).data("id"))
			) {
				attribute.current = this.actor.system[$(event.currentTarget).data("id") as StaticSecondaryAttributeName]
			} else {
				attribute.current =
					this.actor.system.attributes[$(event.currentTarget).data("id") as StaticAttributeName].value
			}
			attribute.attribute_def.combinedName = i18n(
				`gurps.static.${$(event.currentTarget).data("id").toLowerCase()}`
			)
			data.attribute = attribute
		}
		if (
			[
				RollType.Damage,
				RollType.Attack,
				RollType.Skill,
				RollType.SkillRelative,
				RollType.Spell,
				RollType.SpellRelative,
			].includes(type)
		)
			data.item = await fromUuid($(event.currentTarget).data("uuid"))
		// Data.item = this.actor.deepItems.get($(event.currentTarget).data("item-id"));
		if ([RollType.Damage, RollType.Attack].includes(type))
			data.weapon = data.item.weapons.get($(event.currentTarget).data("attack-id"))
		if (type === RollType.Modifier) {
			data.modifier = $(event.currentTarget).data("modifier")
			data.comment = $(event.currentTarget).data("comment")
		}
		return RollGURPS.handleRoll((game as Game).user, this.actor, data)
	}

	protected async _onRollableHover(event: JQuery.MouseOverEvent | JQuery.MouseOutEvent, hover: boolean) {
		event.preventDefault()
		if (this.actor.editing) {
			event.currentTarget.classList.remove("hover")
			return
		}
		if (hover) event.currentTarget.classList.add("hover")
		else event.currentTarget.classList.remove("hover")
	}
}

export interface StaticCharacterSheetGURPS extends ActorSheetGURPS {
	editing: boolean
	object: StaticCharacterGURPS
}
