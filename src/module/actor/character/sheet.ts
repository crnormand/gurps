import { ActorSheetGURPS } from "@actor/base/sheet"
import {
	EquipmentContainerGURPS,
	EquipmentGURPS,
	ItemGURPS,
	NoteContainerGURPS,
	NoteGURPS,
	RitualMagicSpellGURPS,
	SkillContainerGURPS,
	SkillGURPS,
	SpellContainerGURPS,
	SpellGURPS,
	TechniqueGURPS,
	TraitContainerGURPS,
	TraitGURPS,
} from "@item"
import { Attribute, AttributeObj } from "@module/attribute"
import { AttributeType } from "@module/attribute/attribute_def"
import { CondMod } from "@module/conditional-modifier"
import { RollType, SYSTEM_NAME } from "@module/data"
import { openPDF } from "@module/pdf"
import { ResourceTrackerObj } from "@module/resource_tracker"
import { MeleeWeapon, RangedWeapon } from "@module/weapon"
import { dollarFormat, RollGURPS } from "@util"
import { weightFormat } from "@util/measure"
import { CharacterGURPS } from "."
import { CharacterSheetConfig } from "./config_sheet"
import { Encumbrance } from "./data"
import { PointRecordSheet } from "./points_sheet"

export class CharacterSheetGURPS extends ActorSheetGURPS {
	config: CharacterSheetConfig | null = null

	static override get defaultOptions(): ActorSheet.Options {
		return mergeObject(super.defaultOptions, {
			classes: super.defaultOptions.classes.concat(["character"]),
			width: 800,
			height: 800,
			tabs: [{ navSelector: ".tabs-navigation", contentSelector: ".tabs-content", initial: "lifting" }],
		})
	}

	override get template(): string {
		return `/systems/${SYSTEM_NAME}/templates/actor/character/sheet.hbs`
	}

	protected _onDrop(event: DragEvent): void {
		console.log(event)
		super._onDrop(event)
	}

	protected async _updateObject(event: Event, formData: Record<string, unknown>): Promise<unknown> {
		// Edit total points when unspent points are edited
		if (Object.keys(formData).includes("actor.unspentPoints")) {
			formData["system.total_points"] = (formData["actor.unspentPoints"] as number) + this.actor.spentPoints
			delete formData["actor.unspentPoints"]
		}

		// Set values inside system.attributes array, and amend written values based on input
		for (const i of Object.keys(formData)) {
			if (i.startsWith("attributes.")) {
				const attributes: AttributeObj[] =
					(formData["system.attributes"] as AttributeObj[]) ?? duplicate(this.actor.system.attributes)
				const id = i.split(".")[1]
				const att = this.actor.attributes.get(id)
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
			if (i.startsWith("resource_trackers.")) {
				const resource_trackers: ResourceTrackerObj[] =
					(formData["system.resource_trackers"] as ResourceTrackerObj[]) ??
					duplicate(this.actor.system.resource_trackers)
				const id = i.split(".")[1]
				const tracker = this.actor.resource_trackers.get(id)
				if (tracker) {
					let damage = tracker.max - Number(formData[i])
					if (tracker.tracker_def.isMaxEnforced) damage = Math.max(damage, 0)
					if (tracker.tracker_def.isMinEnforced) damage = Math.min(damage, tracker.max - tracker.min)
					if (i.endsWith(".damage")) (formData[i] as number) = damage
				}
				const key = i.replace(`resource_trackers.${id}.`, "")
				const index = resource_trackers.findIndex(e => e.tracker_id === id)
				setProperty(resource_trackers[index], key, formData[i])
				formData["system.resource_trackers"] = resource_trackers
				delete formData[i]
			}
		}
		return super._updateObject(event, formData)
	}

	override activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)

		html.find(".menu").on("click", event => this._getPoolContextMenu(event, html))
		html.find("input").on("change", event => this._resizeInput(event))
		html.find(".dropdown-toggle").on("click", event => this._onCollapseToggle(event))
		html.find(".reference").on("click", event => this._handlePDF(event))
		html.find(".item").on("dblclick", event => this._openItemSheet(event))
		html.find(".equipped").on("click", event => this._onEquippedToggle(event))
		html.find(".rollable").on("mouseover", event => this._onRollableHover(event, true))
		html.find(".rollable").on("mouseout", event => this._onRollableHover(event, false))
		html.find(":not(.disabled) > > .rollable").on("click", event => this._onClickRoll(event))

		// Hover Over
		html.find(".item").on("dragover", event => this._onDragItem(event))
		// Html.find(".item").on("dragleave", event => this._onItemDragLeave(event))
		// html.find(".item").on("dragenter", event => this._onItemDragEnter(event))

		if (this.actor.editing) html.find(".rollable").addClass("noroll")

		// Points Record
		html.find(".edit-points").on("click", event => this._openPointsRecord(event))
	}

	async _getPoolContextMenu(event: JQuery.ClickEvent, html: JQuery<HTMLElement>): Promise<void> {
		event.preventDefault()
		const id = $(event.currentTarget).data("id")
		const attribute = this.actor.attributes.get(id)
		if (!attribute) return
		attribute.apply_ops ??= true
		const apply_ops = attribute.apply_ops
		const ctx = new ContextMenu(html, "#pool-attributes .menu", [
			{
				name: "Apply Threshold Modifiers",
				icon: attribute.apply_ops ? "<i class='gcs-checkmark'></i>" : "",
				callback: () => {
					const update: any = {}
					update[`attributes.${id}.apply_ops`] = !apply_ops
					return this._updateObject(event as unknown as Event, update)
				},
			},
		])
		await ctx.render($(event.currentTarget))
		// $(event.currentTarget).trigger("contextmenu")
	}

	protected _resizeInput(event: JQuery.ChangeEvent) {
		event.preventDefault()
		const field = event.currentTarget
		$(field).css("min-width", `${field.value.length}ch`)
	}

	protected _onCollapseToggle(event: JQuery.ClickEvent): void {
		event.preventDefault()
		const uuid: string = $(event.currentTarget).data("uuid")
		const id = uuid.split(".").at(-1) ?? ""
		const open = !!$(event.currentTarget).attr("class")?.includes("closed")
		const item = this.actor.deepItems.get(id)
		// @ts-ignore
		item?.update({ _id: id, "system.open": open }, { noPrepare: true })
	}

	protected async _handlePDF(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()
		const pdf = $(event.currentTarget).data("pdf")
		if (pdf) return openPDF(pdf)
	}

	protected async _openItemSheet(event: JQuery.DoubleClickEvent) {
		event.preventDefault()
		const uuid: string = $(event.currentTarget).data("uuid")
		const id = uuid.split(".").at(-1) ?? ""
		const item = this.actor.deepItems.get(id)
		item?.sheet?.render(true)
	}

	protected async _openPointsRecord(event: JQuery.ClickEvent) {
		event.preventDefault()
		new PointRecordSheet(this.document as CharacterGURPS, {
			top: this.position.top! + 40,
			left: this.position.left! + (this.position.width! - DocumentSheet.defaultOptions.width!) / 2,
		}).render(true)
	}

	protected async _onEquippedToggle(event: JQuery.ClickEvent) {
		event.preventDefault()
		const uuid = $(event.currentTarget).data("uuid")
		const item = await fromUuid(uuid)
		return item?.update({
			"system.equipped": !(item as EquipmentGURPS).equipped,
		})
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

	protected async _onClickRoll(event: JQuery.ClickEvent) {
		event.preventDefault()
		if (this.actor.editing) return
		const type: RollType = $(event.currentTarget).data("type")
		const data: { [key: string]: any } = { type: type }
		if (type === RollType.Attribute) {
			data.attribute = this.actor.attributes.get($(event.currentTarget).data("id"))
		}
		if (
			[
				RollType.Damage,
				RollType.Attack,
				RollType.Skill,
				RollType.SkillRelative,
				RollType.Spell,
				RollType.SpellRelative,
				RollType.ControlRoll,
			].includes(type)
		)
			data.item = await fromUuid($(event.currentTarget).data("uuid"))
		// Data.item = this.actor.deepItems.get($(event.currentTarget).data("item-id"));
		if ([RollType.Damage, RollType.Attack].includes(type))
			data.weapon = data.item.weapons.get($(event.currentTarget).data("attack-id"))

		// Array.from(game.users.get("zyTvt0jv0VqeYANd").targets)[0]

		if (type === RollType.Modifier) {
			data.modifier = $(event.currentTarget).data("modifier")
			data.comment = $(event.currentTarget).data("comment")
		}
		return RollGURPS.handleRoll((game as Game).user, this.actor, data)
	}

	protected _onDragItem(event: JQuery.DragOverEvent): void {
		let element = $(event.currentTarget!).closest(".item.desc")
		if (!element.length) return
		const heightAcross = (event.pageY! - element.offset()!.top) / element.height()!
		const widthAcross = (event.pageX! - element.offset()!.left) / element.width()!
		const inContainer = widthAcross > 0.3 && element.hasClass("container")
		if (heightAcross > 0.5 && element.hasClass("border-bottom")) return
		if (heightAcross < 0.5 && element.hasClass("border-top")) return
		if (inContainer && element.hasClass("border-in")) return
		$(".border-bottom").removeClass("border-bottom")
		const selection = Array.prototype.slice.call(element.nextUntil(".item.desc"))
		selection.unshift(element)
		if (inContainer) {
			for (const e of selection) $(e).addClass("border-in")
		} else if (heightAcross > 0.5) {
			for (const e of selection) $(e).addClass("border-bottom")
		} else {
			for (const e of selection) $(e).addClass("border-top")
		}
	}

	// Protected async _onDragItem(event: JQuery.DragEnterEvent) {
	// 	event.preventDefault()
	// 	$(".border-top").removeClass("border-top")
	// 	const item = $(event.currentTarget).closest(".item.desc")
	// 	const selection = Array.prototype.slice.call(item.nextUntil(".item.desc"))
	// 	selection.unshift(item)
	// 	for (const e of selection) $(e).addClass("border-top")
	// }

	// protected async _onItemDragLeave(event: JQuery.DragLeaveEvent) {
	// 	event.preventDefault()
	// }

	getData(options?: Partial<ActorSheet.Options> | undefined): any {
		const actorData = this.actor.toObject(false) as any
		const items = deepClone(
			this.actor.items
				.map(item => item as Item)
				// @ts-ignore
				.sort((a: Item, b: Item) => (a.sort ?? 0) - (b.sort ?? 0))
		)
		const [primary_attributes, secondary_attributes, point_pools] = this.prepareAttributes(this.actor.attributes)
		const resource_trackers = Array.from(this.actor.resource_trackers.values())
		const encumbrance = this.prepareEncumbrance()
		const lifts = this.prepareLifts()
		const overencumbered = this.actor.allEncumbrance.at(-1)!.maximum_carry! < this.actor!.weightCarried(false)
		const sheetData = {
			...super.getData(options),
			...{
				system: actorData.system,
				items: items,
				settings: (actorData.system as any).settings,
				editing: this.actor.editing,
				primary_attributes: primary_attributes,
				secondary_attributes: secondary_attributes,
				point_pools: point_pools,
				resource_trackers: resource_trackers,
				encumbrance: encumbrance,
				lifting: lifts,
				current_year: new Date().getFullYear(),
				maneuvers: (CONFIG as any).GURPS.select.maneuvers,
				postures: (CONFIG as any).GURPS.select.postures,
				move_types: (CONFIG as any).GURPS.select.move_types,
				overencumbered: overencumbered,
			},
		}
		this.prepareItems(sheetData)
		return sheetData
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

	prepareEncumbrance() {
		const encumbrance: Array<Encumbrance & { active?: boolean; carry?: string }> = [...this.actor.allEncumbrance]
		for (const e of encumbrance) {
			if (e.level === this.actor.encumbranceLevel(true).level) e.active = true
			e.carry = weightFormat(e.maximum_carry, this.actor.weightUnits)
		}
		return encumbrance
	}

	prepareLifts() {
		const lifts = {
			basic_lift: weightFormat(this.actor.basicLift, this.actor.weightUnits),
			one_handed_lift: weightFormat(this.actor.oneHandedLift, this.actor.weightUnits),
			two_handed_lift: weightFormat(this.actor.twoHandedLift, this.actor.weightUnits),
			shove: weightFormat(this.actor.shove, this.actor.weightUnits),
			running_shove: weightFormat(this.actor.runningShove, this.actor.weightUnits),
			carry_on_back: weightFormat(this.actor.carryOnBack, this.actor.weightUnits),
			shift_slightly: weightFormat(this.actor.shiftSlightly, this.actor.weightUnits),
		}
		return lifts
	}

	prepareItems(data: any) {
		const [traits, skills, spells, equipment, other_equipment, notes] = data.items.reduce(
			(arr: ItemGURPS[][], item: ItemGURPS) => {
				if (item instanceof TraitGURPS || item instanceof TraitContainerGURPS) arr[0].push(item)
				else if (
					item instanceof SkillGURPS ||
					item instanceof TechniqueGURPS ||
					item instanceof SkillContainerGURPS
				)
					arr[1].push(item)
				else if (
					item instanceof SpellGURPS ||
					item instanceof RitualMagicSpellGURPS ||
					item instanceof SpellContainerGURPS
				)
					arr[2].push(item)
				else if (item instanceof EquipmentGURPS || item instanceof EquipmentContainerGURPS) {
					if (item.other) arr[4].push(item)
					else arr[3].push(item)
				} else if (item instanceof NoteGURPS || item instanceof NoteContainerGURPS) arr[5].push(item)
				return arr
			},
			[[], [], [], [], [], []]
		)

		const melee: MeleeWeapon[] = this.actor.meleeWeapons
		const ranged: RangedWeapon[] = this.actor.rangedWeapons
		const reactions: CondMod[] = this.actor.reactions
		const conditionalModifiers: CondMod[] = this.actor.conditionalModifiers

		const carried_value = this.actor.wealthCarried()
		let carried_weight = this.actor.weightCarried(true)

		data.carried_weight = `${carried_weight} lb`
		data.carried_value = dollarFormat(carried_value)

		data.traits = traits
		data.skills = skills
		data.spells = spells
		data.equipment = equipment
		data.other_equipment = other_equipment
		data.notes = notes
		data.melee = melee
		data.ranged = ranged
		data.reactions = reactions
		data.conditionalModifiers = conditionalModifiers
		data.blocks = {
			traits: traits,
			skills: skills,
			spells: spells,
			equipment: equipment,
			other_equipment: other_equipment,
			notes: notes,
			melee: melee,
			ranged: ranged,
			reactions: reactions,
			conditional_modifiers: conditionalModifiers,
		}
	}

	// Events
	async _onEditToggle(event: JQuery.ClickEvent) {
		event.preventDefault()
		$(event.currentTarget).find("i").toggleClass("fa-unlock fa-lock")
		await this.actor.update({ "system.editing": !this.actor.editing })
	}

	protected override _getHeaderButtons(): Application.HeaderButton[] {
		const edit_button = {
			label: "",
			class: "edit-toggle",
			icon: `fas fa-${this.actor.editing ? "un" : ""}lock`,
			onclick: (event: any) => this._onEditToggle(event),
		}
		const buttons: Application.HeaderButton[] = this.actor.canUserModify((game as Game).user!, "update")
			? [
					edit_button,
					// {
					// 	label: "",
					// 	// Label: "Import",
					// 	class: "import",
					// 	icon: "fas fa-file-import",
					// 	onclick: event => this._onFileImport(event),
					// },
					{
						label: "",
						class: "gmenu",
						icon: "gcs-all-seeing-eye",
						onclick: event => this._openGMenu(event),
					},
			  ]
			: []
		const all_buttons = [...buttons, ...super._getHeaderButtons()]
		// All_buttons.at(-1)!.label = ""
		// all_buttons.at(-1)!.icon = "gcs-circled-x"
		return all_buttons
		// Return buttons.concat(super._getHeaderButtons());
	}

	// Async _onFileImport(event: any) {
	// 	event.preventDefault()
	// 	this.actor.importCharacter()
	// }

	protected async _openGMenu(event: JQuery.ClickEvent) {
		event.preventDefault()
		this.config ??= new CharacterSheetConfig(this.document as CharacterGURPS, {
			top: this.position.top! + 40,
			left: this.position.left! + (this.position.width! - DocumentSheet.defaultOptions.width!) / 2,
		})
		this.config.render(true)
	}

	async close(options?: FormApplication.CloseOptions | undefined): Promise<void> {
		await this.config?.close(options)
		return super.close(options)
	}
}

export interface CharacterSheetGURPS extends ActorSheetGURPS {
	editing: boolean
	object: CharacterGURPS
}
