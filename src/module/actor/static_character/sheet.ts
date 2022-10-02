import { ActorSheetGURPS } from "@actor/base/sheet"
import { RollType } from "@module/data"
import { openPDF } from "@module/pdf"
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
			tabs: [{ navSelector: ".tabs-navigation", contentSelector: ".tabs-content", initial: "lifting" }],
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
		// Const items = deepClone(
		// 	this.actor.items
		// 		.map(item => item as Item)
		// 		// @ts-ignore until types v10
		// 		.sort((a: Item, b: Item) => (a.sort ?? 0) - (b.sort ?? 0))
		// )
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
			current_year: new Date().getFullYear(),
			maneuvers: (CONFIG as any).GURPS.select.maneuvers,
			postures: (CONFIG as any).GURPS.select.postures,
			move_types: (CONFIG as any).GURPS.select.move_types,
		}

		return sheetData
	}

	override activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		// Html.find(".input").on("change", event => this._resizeInput(event))
		// html.find(".dropdown-toggle").on("click", event => this._onCollapseToggle(event))
		html.find(".reference").on("click", event => this._handlePDF(event))
		// Html.find(".item").on("dblclick", event => this._openItemSheet(event))
		// html.find(".equipped").on("click", event => this._onEquippedToggle(event))
		html.find(".rollable").on("mouseover", event => this._onRollableHover(event, true))
		html.find(".rollable").on("mouseout", event => this._onRollableHover(event, false))
		html.find(".rollable").on("click", event => this._onClickRoll(event))

		// Hover Over
		// html.find(".item").on("dragleave", event => this._onItemDragLeave(event))
		// html.find(".item").on("dragenter", event => this._onItemDragEnter(event))
	}

	protected async _handlePDF(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()
		const pdf = $(event.currentTarget).data("pdf")
		if (pdf) return openPDF(pdf)
	}

	protected async _onClickRoll(event: JQuery.ClickEvent) {
		event.preventDefault()
		if (this.actor.editing) return
		const type: RollType = $(event.currentTarget).data("type")
		const data: { [key: string]: any } = { type: type }
		if (type === RollType.Attribute) {
			const attribute = {
				current: 0,
				attr_id: "",
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
			attribute.attr_id = $(event.currentTarget).data("id").toLowerCase()
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

	async _onEditToggle(event: JQuery.ClickEvent) {
		event.preventDefault()
		await this.actor.update({ "system.editing": !this.actor.editing })
		$(event.currentTarget).find("i").toggleClass("fa-unlock fa-lock")
		return this.render()
	}

	protected override _getHeaderButtons(): Application.HeaderButton[] {
		const edit_button = {
			label: "",
			class: "edit-toggle",
			icon: `fas fa-${this.actor.editing ? "un" : ""}lock`,
			onclick: (event: any) => this._onEditToggle(event),
		}
		const buttons: Application.HeaderButton[] = [
			edit_button,
			// {
			// 	label: "",
			// 	class: "attributes",
			// 	icon: "gcs-attribute",
			// 	onclick: event => this._onAttributeSettingsClick(event),
			// },
			// {
			// 	label: "",
			// 	class: "body-type",
			// 	icon: "gcs-body-type",
			// 	onclick: event => this._onBodyTypeSettingsClick(event),
			// },
			{
				label: "",
				// Label: "Import",
				class: "import",
				icon: "fas fa-file-import",
				onclick: event => this._onFileImport(event),
			},
		]
		const all_buttons = [...buttons, ...super._getHeaderButtons()]
		// All_buttons.at(-1)!.label = ""
		// all_buttons.at(-1)!.icon = "gcs-circled-x"
		return all_buttons
		// Return buttons.concat(super._getHeaderButtons());
	}

	async _onFileImport(event: any) {
		event.preventDefault()
		this.actor.importCharacter()
	}
}

export interface StaticCharacterSheetGURPS extends ActorSheetGURPS {
	editing: boolean
	object: StaticCharacterGURPS
}
