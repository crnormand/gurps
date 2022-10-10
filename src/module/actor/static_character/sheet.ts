import { ActorSheetGURPS } from "@actor/base/sheet"
import { CharacterSheetConfig } from "@actor/character/config_sheet"
import { RollType } from "@module/data"
import { openPDF } from "@module/pdf"
import { SYSTEM_NAME } from "@module/settings"
import { i18n, RollGURPS, Static } from "@util"
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

		let deprecation = this.actor.getFlag(SYSTEM_NAME, "deprecation_acknowledged") ?? false
		// Don't show deprecation warning if character is not imported
		deprecation = deprecation || this.actor.system.additionalresources.importpath === ""

		const sheetData = {
			...super.getData(options),
			system: actorData.system,
			editing: this.actor.editing,
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
			deprecation: deprecation,
		}

		return sheetData
	}

	override activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		// Html.find(".input").on("change", event => this._resizeInput(event))
		html.find(".dropdown-toggle").on("click", event => this._onCollapseToggle(event))
		html.find(".reference").on("click", event => this._handlePDF(event))
		// Html.find(".item").on("dblclick", event => this._openItemSheet(event))
		// html.find(".equipped").on("click", event => this._onEquippedToggle(event))
		html.find(".rollable").on("mouseover", event => this._onRollableHover(event, true))
		html.find(".rollable").on("mouseout", event => this._onRollableHover(event, false))
		html.find(".rollable").on("click", event => this._onClickRoll(event))
		html.find(".equipped").on("click", event => this._onClickEquip(event))
		html.find(".deprecation a").on("click", event => {
			event.preventDefault()
			this.actor.setFlag(SYSTEM_NAME, "deprecation_acknowledged", true)
		})

		// Hover Over
		// html.find(".item").on("dragleave", event => this._onItemDragLeave(event))
		// html.find(".item").on("dragenter", event => this._onItemDragEnter(event))
	}

	protected _onCollapseToggle(event: JQuery.ClickEvent): void {
		event.preventDefault()
		const path = $(event.currentTarget).data("key")
		this.actor.toggleExpand(path)
	}

	async _onClickEquip(event: JQuery.ClickEvent) {
		event.preventDefault()
		const key = $(event.currentTarget).data("key")
		let eqt = duplicate(Static.decode(this.actor, key))
		eqt.equipped = !eqt.equipped
		await this.actor.update({ [key]: eqt })
		await this.actor.updateItemAdditionsBasedOn(eqt, key)
		let p = this.actor.getEquippedParry()
		let b = this.actor.getEquippedBlock()
		await this.actor.update({
			"system.equippedparry": p,
			"system.equippedblock": b,
		})
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
		if ([RollType.Skill, RollType.SkillRelative, RollType.Spell, RollType.SpellRelative].includes(type)) {
			Static.recurseList(this.actor.system.skills, e => {
				if (e.uuid === $(event.currentTarget).data("uuid"))
					data.item = {
						formattedName: e.name,
						skillLevel: e.level,
					}
			})
		}
		if ([RollType.Damage, RollType.Attack].includes(type)) {
			Static.recurseList(
				this.actor.system[$(event.currentTarget).data("weapon") as "melee" | "ranged"],
				(e, k) => {
					if (k === $(event.currentTarget).data("uuid"))
						data.weapon = {
							name: e.name,
							usage: e.mode,
							skillLevel: parseInt(e.import) || 0,
						}
				}
			)
		}
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
		const buttons: Application.HeaderButton[] =
			this.actor.canUserModify((game as Game).user!, "update") ?
				[
					edit_button,
					{
						label: "",
						// Label: "Import",
						class: "import",
						icon: "fas fa-file-import",
						onclick: event => this._onFileImport(event),
					},
					{
						label: "",
						class: "gmenu",
						icon: "gcs-all-seeing-eye",
						onclick: event => this._onGMenu(event),
					},
				]
				: []
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

	protected async _onGMenu(event: JQuery.ClickEvent) {
		event.preventDefault()
		// new CharacterSheetConfig(this.document as StaticCh, {
		// 	top: this.position.top! + 40,
		// 	left: this.position.left! + (this.position.width! - DocumentSheet.defaultOptions.width!) / 2,
		// }).render(true)
	}
}

export interface StaticCharacterSheetGURPS extends ActorSheetGURPS {
	editing: boolean
	object: StaticCharacterGURPS
}
