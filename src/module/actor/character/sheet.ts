import { ActorFlags, ActorSheetGURPS } from "@actor/base"
import {
	EquipmentContainerGURPS,
	EquipmentGURPS,
	ManeuverID,
	MeleeWeaponGURPS,
	NoteContainerGURPS,
	NoteGURPS,
	Postures,
	RangedWeaponGURPS,
	RitualMagicSpellGURPS,
	SkillContainerGURPS,
	SkillGURPS,
	SpellContainerGURPS,
	SpellGURPS,
	TechniqueGURPS,
	TraitContainerGURPS,
	TraitGURPS,
} from "@item"
import { Attribute, AttributeObj, AttributeType } from "@module/attribute"
import { CondMod } from "@module/conditional-modifier"
import { ItemGURPS } from "@module/config"
import { gid, ItemType, RollType, SYSTEM_NAME } from "@module/data"
import { openPDF } from "@module/pdf"
import { ResourceTrackerObj } from "@module/resource_tracker"
import { RollGURPS } from "@module/roll"
import { dollarFormat, i18n, Length, Weight } from "@util"
import { CharacterSheetConfig } from "./config_sheet"
import { CharacterMove, Encumbrance } from "./data"
import { CharacterGURPS } from "./document"
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
			// If (i === "system.move.posture")
			// 	if (getProperty(this.actor, i) !== formData[i]) this.actor.changePosture(formData[i] as any)
			// if (i === "system.move.maneuver")
			// 	if (getProperty(this.actor, i) !== formData[i]) this.actor.changeManeuver(formData[i] as any)
		}
		return super._updateObject(event, formData)
	}

	override activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		if (this.actor.editing) html.find(".rollable").addClass("noroll")

		html.find(".menu").on("click", event => this._getPoolContextMenu(event, html))
		html.find("input").on("change", event => this._resizeInput(event))
		html.find(".dropdown-toggle").on("click", event => this._onCollapseToggle(event))
		html.find(".ref").on("click", event => this._handlePDF(event))
		html.find(".item-list .header.desc").on("contextmenu", event => this._getAddItemMenu(event, html))
		html.find(".item").on("dblclick", event => this._openItemSheet(event))
		html.find(".item").on("contextmenu", event => this._getItemContextMenu(event, html))
		html.find(".equipped").on("click", event => this._onEquippedToggle(event))
		html.find(".rollable").on("mouseover", event => this._onRollableHover(event, true))
		html.find(".rollable").on("mouseout", event => this._onRollableHover(event, false))
		html.find(":not(.disabled) > > .rollable").on("click", event => this._onClickRoll(event))

		// Maneuver / Posture Selection
		html.find(".move-select").on("change", event => this._onMoveChange(event))

		// Hover Over
		html.find(".item").on("dragover", event => this._onDragItem(event))
		// Html.find(".item").on("dragleave", event => this._onItemDragLeave(event))
		// html.find(".item").on("dragenter", event => this._onItemDragEnter(event))

		// Points Record
		html.find(".edit-points").on("click", event => this._openPointsRecord(event))

		// Manual Encumbrance
		html.find(".enc-toggle").on("click", event => this._toggleAutoEncumbrance(event))
		html.find(".encumbrance-marker.manual").on("click", event => this._setEncumbrance(event))
	}

	async _onMoveChange(event: JQuery.ChangeEvent): Promise<any> {
		event.preventDefault()
		event.stopPropagation()
		const element = $(event.currentTarget)
		const type = element.data("name")
		switch (type) {
			case "maneuver":
				return this.actor.changeManeuver(element.val() as any)
			case "posture":
				return this.actor.changePosture(element.val() as any)
			default:
				return this.actor.setFlag(SYSTEM_NAME, ActorFlags.MoveType, element.val())
		}
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

	async _getAddItemMenu(event: JQuery.ContextMenuEvent, html: JQuery<HTMLElement>) {
		event.preventDefault()
		const element = $(event.currentTarget)
		const type = element.parent(".item-list")[0].id
		const ctx = new ContextMenu(html, ".menu", [])
		ctx.menuItems = (function(self: CharacterSheetGURPS): ContextMenuEntry[] {
			switch (type) {
				case "traits":
					return [
						{
							name: i18n("gurps.context.new_trait"),
							icon: "<i class='gcs-trait'></i>",
							callback: () => self._newItem(ItemType.Trait),
						},
						{
							name: i18n("gurps.context.new_trait_container"),
							icon: "<i class='gcs-trait'></i>",
							callback: () => self._newItem(ItemType.TraitContainer),
						},
						{
							name: i18n("gurps.context.new_natural_attacks"),
							icon: "<i class='gcs-melee-weapon'></i>",
							callback: () => self._newNaturalAttacks(),
						},
					]
				case "skills":
					return [
						{
							name: i18n("gurps.context.new_skill"),
							icon: "<i class='gcs-skill'></i>",
							callback: () => self._newItem(ItemType.Skill),
						},
						{
							name: i18n("gurps.context.new_skill_container"),
							icon: "<i class='gcs-skill'></i>",
							callback: () => self._newItem(ItemType.SkillContainer),
						},
						{
							name: i18n("gurps.context.new_technique"),
							icon: "<i class='gcs-skill'></i>",
							callback: () => self._newItem(ItemType.Technique),
						},
					]
				case "spells":
					return [
						{
							name: i18n("gurps.context.new_spell"),
							icon: "<i class='gcs-spell'></i>",
							callback: () => self._newItem(ItemType.Spell),
						},
						{
							name: i18n("gurps.context.new_spell_container"),
							icon: "<i class='gcs-spell'></i>",
							callback: () => self._newItem(ItemType.SpellContainer),
						},
						{
							name: i18n("gurps.context.new_ritual_magic_spell"),
							icon: "<i class='gcs-spell'></i>",
							callback: () => self._newItem(ItemType.RitualMagicSpell),
						},
					]
				case "equipment":
					return [
						{
							name: i18n("gurps.context.new_carried_equipment"),
							icon: "<i class='gcs-equipment'></i>",
							callback: () => self._newItem(ItemType.Equipment),
						},
						{
							name: i18n("gurps.context.new_carried_equipment_container"),
							icon: "<i class='gcs-equipment'></i>",
							callback: () => self._newItem(ItemType.EquipmentContainer),
						},
					]
				case "other-equipment":
					return [
						{
							name: i18n("gurps.context.new_other_equipment"),
							icon: "<i class='gcs-equipment'></i>",
							callback: () => self._newItem(ItemType.Equipment, true),
						},
						{
							name: i18n("gurps.context.new_other_equipment_container"),
							icon: "<i class='gcs-equipment'></i>",
							callback: () => self._newItem(ItemType.EquipmentContainer, true),
						},
					]
				case "notes":
					return [
						{
							name: i18n("gurps.context.new_note"),
							icon: "<i class='gcs-note'></i>",
							callback: () => self._newItem(ItemType.Note),
						},
						{
							name: i18n("gurps.context.new_note_container"),
							icon: "<i class='gcs-note'></i>",
							callback: () => self._newItem(ItemType.NoteContainer),
						},
					]
				default:
					return []
			}
		})(this)
		await ctx.render(element)
	}

	async _newItem(type: ItemType, other = false) {
		const itemName = `ITEM.Type${type.charAt(0).toUpperCase()}${type.slice(1)}`
		const itemData: any = {
			type,
			name: i18n(itemName),
			system: {},
		}
		if (other) itemData.system.other = true
		const item = (await this.actor.createEmbeddedDocuments("Item", [itemData], { temporary: false }))[0]
		return item.sheet.render(true)
	}

	async _newNaturalAttacks() {
		const itemName = i18n("gurps.item.natural_attacks")
		const itemData = {
			type: ItemType.Trait,
			name: itemName,
			system: {
				reference: "B271",
			},
			flags: {
				[SYSTEM_NAME]: {
					contentsData: [
						{
							type: ItemType.MeleeWeapon,
							name: "Bite",
							_id: randomID(),
							system: {
								usage: "Bite",
								reach: "C",
								parry: "No",
								block: "No",
								strength: "",
								damage: {
									type: "cr",
									st: "thr",
									base: "-1",
								},
								defaults: [{ type: "dx" }, { type: "skill", name: "Brawling" }],
							},
						},
						{
							type: ItemType.MeleeWeapon,
							name: "Punch",
							_id: randomID(),
							system: {
								usage: "Punch",
								reach: "C",
								parry: "0",
								strength: "",
								damage: {
									type: "cr",
									st: "thr",
									base: "-1",
								},
								defaults: [
									{ type: "dx" },
									{ type: "skill", name: "Boxing" },
									{ type: "skill", name: "Brawling" },
									{ type: "skill", name: "Karate" },
								],
							},
						},
						{
							type: ItemType.MeleeWeapon,
							name: "Kick",
							_id: randomID(),
							system: {
								usage: "Kick",
								reach: "C,1",
								parry: "No",
								strength: "",
								damage: {
									type: "cr",
									st: "thr",
								},
								defaults: [
									{ type: "dx", modifier: -2 },
									{ type: "skill", name: "Brawling", modifier: -2 },
									{ type: "skill", name: "Kicking" },
									{ type: "skill", name: "Karate", modifier: -2 },
								],
							},
						},
					],
				},
			},
		}
		const item = (await this.actor.createEmbeddedDocuments("Item", [itemData], { temporary: false }))[0]
		return item.sheet.render(true)
	}

	async _getItemContextMenu(event: JQuery.ContextMenuEvent, html: JQuery<HTMLElement>) {
		event.preventDefault()
		const uuid = $(event.currentTarget).data("uuid")
		const item = this.actor.deepItems.get(uuid.split(".").at(-1))
		if (!item) return
		const ctx = new ContextMenu(html, ".menu", [])
		if (item instanceof TraitGURPS || item instanceof TraitContainerGURPS) {
			ctx.menuItems.push({
				name: i18n("gurps.context.toggle_state"),
				icon: "<i class='fas fa-sliders-simple'></i>",
				callback: () => {
					return item.update({ "system.disabled": item.enabled })
				},
			})
		}
		if (item instanceof EquipmentGURPS || item instanceof EquipmentContainerGURPS) {
			ctx.menuItems.push({
				name: i18n("gurps.context.toggle_state"),
				icon: "<i class='fas fa-sliders-simple'></i>",
				callback: () => {
					return item.update({ "system.equipped": !item.equipped })
				},
			})
		}
		if (item instanceof TraitGURPS && item.isLeveled) {
			ctx.menuItems.push({
				name: i18n("gurps.context.increment"),
				icon: "<i class='fas fa-up'></i>",
				callback: () => {
					let level = item.system.levels + 1
					if (level % 1) level = Math.floor(level)
					return item.update({ "system.levels": level })
				},
			})
			if (item.levels > 0)
				ctx.menuItems.push({
					name: i18n("gurps.context.decrement"),
					icon: "<i class='fas fa-down'></i>",
					callback: () => {
						let level = item.system.levels - 1
						if (level % 1) level = Math.ceil(level)
						return item.update({ "system.levels": level })
					},
				})
		}
		if (
			item instanceof SkillGURPS ||
			item instanceof TechniqueGURPS ||
			item instanceof SpellGURPS ||
			item instanceof RitualMagicSpellGURPS
		) {
			ctx.menuItems.push({
				name: i18n("gurps.context.increment"),
				icon: "<i class='fas fa-up'></i>",
				callback: () => {
					return item.update({ "system.points": item.system.points + 1 })
				},
			})
			if (item.points > 0)
				ctx.menuItems.push({
					name: i18n("gurps.context.decrement"),
					icon: "<i class='fas fa-down'></i>",
					callback: () => {
						return item.update({ "system.points": item.system.points - 1 })
					},
				})
			ctx.menuItems.push({
				name: i18n("gurps.context.increase_level"),
				icon: "<i class='fas fa-up-long'></i>",
				callback: () => {
					return item.incrementSkillLevel()
				},
			})
			if (item.points > 0)
				ctx.menuItems.push({
					name: i18n("gurps.context.decrease_level"),
					icon: "<i class='fas fa-down-long'></i>",
					callback: () => {
						return item.decrementSkillLevel()
					},
				})
		}
		if (item instanceof EquipmentGURPS || item instanceof EquipmentContainerGURPS) {
			ctx.menuItems.push({
				name: i18n("gurps.context.increment"),
				icon: "<i class='fas fa-up'></i>",
				callback: () => {
					return item.update({ "system.quantity": item.system.quantity + 1 })
				},
			})
			if (item.quantity > 0)
				ctx.menuItems.push({
					name: i18n("gurps.context.decrement"),
					icon: "<i class='fas fa-down'></i>",
					callback: () => {
						return item.update({ "system.quantity": item.system.quantity - 1 })
					},
				})
		}
		if (
			item instanceof EquipmentGURPS ||
			item instanceof EquipmentContainerGURPS ||
			((item instanceof SkillGURPS || item instanceof SpellGURPS || item instanceof RitualMagicSpellGURPS) &&
				item.system.tech_level_required)
		) {
			ctx.menuItems.push({
				name: i18n("gurps.context.increase_tech_level"),
				icon: "<i class='fas fa-gear'></i><i class='fas fa-up'></i>",
				callback: () => {
					let tl = item.techLevel
					let tlNumber = tl.match(/\d+/)?.[0]
					if (!tlNumber) return
					const newTLNumber = parseInt(tlNumber) + 1
					tl = tl.replace(tlNumber, `${newTLNumber}`)
					return item.update({ "system.tech_level": tl })
				},
			})
			if (parseInt(item.techLevel) > 0)
				ctx.menuItems.push({
					name: i18n("gurps.context.decrease_tech_level"),
					icon: "<i class='fas fa-gear'></i><i class='fas fa-down'></i>",
					callback: () => {
						let tl = item.techLevel
						let tlNumber = tl.match(/\d+/)?.[0]
						if (!tlNumber) return
						const newTLNumber = parseInt(tlNumber) - 1
						tl = tl.replace(tlNumber, `${newTLNumber}`)
						return item.update({ "system.tech_level": tl })
					},
				})
		}
		ctx.menuItems.push({
			name: i18n("gurps.context.delete"),
			icon: "<i class='gcs-trash'></i>",
			callback: () => {
				return item.delete()
			},
		})
		await ctx.render($(event.currentTarget))
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

	_toggleAutoEncumbrance(event: JQuery.ClickEvent) {
		event.preventDefault()
		const autoEncumbrance = this.actor.getFlag(SYSTEM_NAME, ActorFlags.AutoEncumbrance) as {
			active: boolean
			manual: number
		}
		autoEncumbrance.active = !autoEncumbrance.active
		autoEncumbrance.manual = -1
		const carried = this.actor.weightCarried(false)
		for (const e of this.actor.allEncumbrance) {
			if (carried <= e.maximum_carry) {
				autoEncumbrance.manual = e.level
				break
			}
		}
		if (autoEncumbrance.manual === -1)
			autoEncumbrance.manual = this.actor.allEncumbrance[this.actor.allEncumbrance.length - 1].level
		return this.actor.setFlag(SYSTEM_NAME, ActorFlags.AutoEncumbrance, autoEncumbrance)
	}

	_setEncumbrance(event: JQuery.ClickEvent) {
		event.preventDefault()
		const level = Number($(event.currentTarget).data("level"))
		const autoEncumbrance = this.actor.getFlag(SYSTEM_NAME, ActorFlags.AutoEncumbrance) as {
			active: boolean
			manual: number
		}
		autoEncumbrance.manual = level
		return this.actor.setFlag(SYSTEM_NAME, ActorFlags.AutoEncumbrance, autoEncumbrance)
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
		const data: Record<string, any> = { type: type, hidden: event.ctrlKey }
		if (type === RollType.Attribute) {
			const id = $(event.currentTarget).data("id")
			if (id === gid.Dodge) data.attribute = this.actor.dodgeAttribute
			// Else if (id === gid.SizeModifier) data.attribute = this.actor.sizeModAttribute
			else data.attribute = this.actor.attributes.get(id)
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
		) {
			const attack_id = $(event.currentTarget).data("attack-id")
			if (![gid.Thrust, gid.Swing].includes(attack_id)) {
				data.item = await fromUuid($(event.currentTarget).data("uuid"))
			}
		}
		if (type === RollType.Modifier) {
			data.modifier = $(event.currentTarget).data("modifier")
			data.comment = $(event.currentTarget).data("comment")
		}
		return RollGURPS.handleRoll(game.user, this.actor, data)
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
		$(".border-top").removeClass("border-top")
		$(".border-in").removeClass("border-in")

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
		const lifting = this.prepareLifts()
		const moveData = this.prepareMoveData()
		const overencumbered = this.actor.allEncumbrance.at(-1)!.maximum_carry! < this.actor!.weightCarried(false)
		const hit_locations = this.actor.HitLocations.map(e => {
			return {
				...e,
				...{
					displayDR: e.displayDR,
				},
			}
		})

		const heightUnits = this.actor.settings.default_length_units
		const weightUnits = this.actor.settings.default_weight_units
		const height = Length.format(Length.fromString(this.actor.profile?.height || ""), heightUnits)
		const weight = Weight.format(Weight.fromString(this.actor.profile?.weight || ""), weightUnits)

		const sheetData = {
			...super.getData(options),
			...{
				system: actorData.system,
				items,
				settings: (actorData.system as any).settings,
				editing: this.actor.editing,
				primary_attributes,
				secondary_attributes,
				point_pools,
				resource_trackers,
				encumbrance,
				lifting,
				moveData,
				height,
				weight,
				current_year: new Date().getFullYear(),
				maneuvers: CONFIG.GURPS.select.maneuvers,
				postures: CONFIG.GURPS.select.postures,
				move_types: CONFIG.GURPS.select.move_types,
				autoEncumbrance: (this.actor.getFlag(SYSTEM_NAME, ActorFlags.AutoEncumbrance) as any)?.active,
				overencumbered,
				hit_locations,
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
		const encumbrance: Array<Encumbrance & { active?: boolean; carry?: string; move?: any; dodge?: any }> = [
			...this.actor.allEncumbrance,
		]
		for (const e of encumbrance) {
			if (e.level === this.actor.encumbranceLevel(true).level) e.active = true
			e.carry = Weight.format(e.maximum_carry, this.actor.weightUnits)
			e.move = {
				current: this.actor.move(e),
				effective: this.actor.eMove(e),
			}
			e.dodge = {
				current: this.actor.dodge(e),
				effective: this.actor.eDodge(e),
			}
		}
		return encumbrance
	}

	prepareLifts() {
		const lifts = {
			basic_lift: Weight.format(this.actor.basicLift, this.actor.weightUnits),
			one_handed_lift: Weight.format(this.actor.oneHandedLift, this.actor.weightUnits),
			two_handed_lift: Weight.format(this.actor.twoHandedLift, this.actor.weightUnits),
			shove: Weight.format(this.actor.shove, this.actor.weightUnits),
			running_shove: Weight.format(this.actor.runningShove, this.actor.weightUnits),
			carry_on_back: Weight.format(this.actor.carryOnBack, this.actor.weightUnits),
			shift_slightly: Weight.format(this.actor.shiftSlightly, this.actor.weightUnits),
		}
		return lifts
	}

	prepareMoveData(): CharacterMove {
		let maneuver: any = "none"
		const currentManeuver = this.actor.conditions.find(e => Object.values(ManeuverID).includes(e.cid as any))

		if (currentManeuver) maneuver = currentManeuver.cid
		let posture: any = "standing"
		const currentPosture = this.actor.conditions.find(e => Postures.includes(e.cid as any))
		if (currentPosture) posture = currentPosture.cid
		const type = this.actor.moveType
		return {
			maneuver,
			posture,
			type,
		}
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

		const melee: MeleeWeaponGURPS[] = [...this.actor.meleeWeapons]
		const ranged: RangedWeaponGURPS[] = [...this.actor.rangedWeapons]
		const reactions: CondMod[] = this.actor.reactions
		const conditionalModifiers: CondMod[] = this.actor.conditionalModifiers

		const carried_value = this.actor.wealthCarried()
		let carried_weight = this.actor.weightCarried(true)

		// Data.carried_weight = `${carried_weight} lb`
		data.carried_weight = Weight.format(carried_weight, this.actor.settings.default_weight_units)
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
		const buttons: Application.HeaderButton[] = this.actor.canUserModify(game.user!, "update")
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
