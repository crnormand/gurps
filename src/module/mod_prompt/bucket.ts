import { ModifierItem, RollModifier, SYSTEM_NAME, UserFlags } from "@module/data"
import { i18n, i18n_f, Measure } from "@util"
// Import { common_modifiers } from "./data"

class ModifierBucket extends Application {
	categoriesOpen: boolean[] = [false, false, false, false, false, false, false, false, false, false]

	constructor(button: any, options = {}) {
		super(options)
		this.value = ""
		this.button = button
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			template: `systems/${SYSTEM_NAME}/templates/modifier-bucket/window.hbs`,
			popOut: false,
			minimizable: false,
			width: 850,
			scrollY: ["#categories .content"],
		})
	}

	async render(force?: boolean | undefined, options?: Application.RenderOptions<ApplicationOptions> | undefined) {
		this.button.showing = true
		await super.render(force, options)
	}

	close(options?: Application.CloseOptions | undefined): Promise<void> {
		this.button.showing = false
		return super.close(options)
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object | Promise<object> {
		const user = (game as Game).user
		let modStack = user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) ?? []
		let meleeMods: RollModifier[] = [
			{ name: "to hit (Determined Attack)", modifier: 4, reference: "B365" },
			{ name: "to hit (Telegraphic Attack)", modifier: 4, reference: "MA113" },
			{ name: "to hit (Deceptive Attack)", modifier: -2, reference: "B369" },
			{ name: "to hit (Move and Attack)", modifier: -2, max: 9, reference: "B365" },
			{ name: "damage (Strong Attack)", modifier: 2, reference: "B365" },
			{ name: "damage (Might Blow)", modifier: 2, cost: { id: "fp", value: 1 }, reference: "MA131" },
			{ name: "Heroic Charge", modifier: 0, cost: { id: "fp", value: 1 }, reference: "MA131" },
		]
		let rangedMods: RollModifier[] = [
			{ name: "Aim", modifier: 1 },
			{ name: "to hit (Determined Attack)", modifier: 1, reference: "B365" },
		]
		let defenseMods: RollModifier[] = [
			{ name: "All-Out Defense", modifier: 2, reference: "B365" },
			{ name: "to Dodge (Shield DB)", modifier: 1, reference: "B374" },
			{ name: "to Dodge (Acrobatics, success)", modifier: 2, reference: "B374" },
			{ name: "to Dodge (Dodge and Drop)", modifier: 3, reference: "B377" },
			{ name: "to Dodge (Retreat)", modifier: 3, reference: "B375" },
			{ name: "to Block/Parry (Retreat)", modifier: 1, reference: "B377" },
			{ name: "to Dodge (Acrobatics, failed)", modifier: -2, reference: "B375" },
			{ name: "to Dodge (attacked from side)", modifier: -2, reference: "B390" },
			{ name: "to Dodge (attacked from reat)", modifier: -4, reference: "B391" },
			{ name: "to defenses due to Deceptive attack", modifier: -1 },
			{ name: "to Will Check, to maintain concentration", modifier: -1 },
			{ name: "Feverish Defense", modifier: +2, cost: { id: "fp", value: 1 } },
		]
		const modifiersStatus: ModifierItem[] = [
			{ name: i18n("gurps.modifier.status.status"), title: true },
			{ name: i18n("gurps.modifier.status.shock_1"), modifier: -1 },
			{ name: i18n("gurps.modifier.status.shock_2"), modifier: -2 },
			{ name: i18n("gurps.modifier.status.shock_3"), modifier: -3 },
			{ name: i18n("gurps.modifier.status.shock_4"), modifier: -4 },
			{ name: i18n("gurps.modifier.status.stunned"), modifier: -4 },
			{ name: i18n("gurps.modifier.status.afflictions"), title: true },
			{ name: i18n("gurps.modifier.status.cough_dx"), modifier: -3 },
			{ name: i18n("gurps.modifier.status.cough_iq"), modifier: -1 },
			{ name: i18n("gurps.modifier.status.drowsy"), modifier: -2 },
			{ name: i18n("gurps.modifier.status.drunk"), modifier: -4 },
			{ name: i18n("gurps.modifier.status.tipsy"), modifier: -1 },
			{ name: i18n("gurps.modifier.status.tipsy_cr"), modifier: -2 },
			{ name: i18n("gurps.modifier.status.nausea"), modifier: -2 },
			{ name: i18n("gurps.modifier.status.nausea_def"), modifier: -1 },
			{ name: i18n("gurps.modifier.status.moderate_pain"), modifier: -2 },
			{ name: i18n("gurps.modifier.status.moderate_pain_hpt"), modifier: -1 },
			{ name: i18n("gurps.modifier.status.severe_pain"), modifier: -4 },
			{ name: i18n("gurps.modifier.status.severe_pain_hpt"), modifier: -2 },
			{ name: i18n("gurps.modifier.status.terrible_pain"), modifier: -6 },
			{ name: i18n("gurps.modifier.status.terrible_pain_hpt"), modifier: -3 },
			{ name: i18n("gurps.modifier.status.retching"), modifier: -5 },
		]

		// TODO: get default length units, use that for string, current values are in yards
		const modifiersSpeed: ModifierItem[] = [
			...[
				[-1, 3],
				[-2, 5],
				[-3, 7],
				[-4, 10],
				[-5, 15],
				[-6, 20],
				[-7, 30],
				[-8, 50],
				[-9, 70],
				[-10, 100],
				[-11, 150],
				[-12, 200],
				[-13, 300],
				[-14, 500],
			].map(([r, d]) => {
				const adjDistance = Measure.lengthFormat(
					Measure.lengthFromNumber(d, Measure.LengthUnits.Yard),
					Measure.LengthUnits.Yard
				)
				return { modifier: r, name: i18n_f("gurps.modifier.speed.range", { distance: adjDistance }) }
			}),
			{
				modifier: -15,
				name: i18n_f("gurps.modifier.speed.range", {
					distance: `${Measure.lengthFormat(
						Measure.lengthFromNumber(500, Measure.LengthUnits.Yard),
						Measure.LengthUnits.Yard
					)}+`,
				}),
			},
		]

		const modifiersSize: ModifierItem[] = [
			{ name: i18n("gurps.modifier.size.melee_ranged"), title: true },
			...[
				[-10, 1.5],
				[-9, 2],
				[-8, 3],
				[-7, 5],
				[-6, 8],
				[-5, 12],
				[-4, 18],
				[-3, 12 * 2],
				[-2, 12 * 3],
				[-1, 12 * 4.5],
				[0, 12 * 6],
				[1, 12 * 9],
				[2, 12 * 15],
				[3, 12 * 21],
				[4, 12 * 30],
				[5, 12 * 45],
				[6, 12 * 60],
				[7, 12 * 90],
				[8, 12 * 150],
				[9, 12 * 210],
				[10, 12 * 300],
			].map(([m, l]) => {
				let size = ""
				if (l < 12) {
					size = `${Measure.lengthFormat(l, Measure.LengthUnits.Inch)} (${Measure.lengthFormat(
						l,
						Measure.LengthUnits.Centimeter
					)})`
				} else if (l < 12 * 3) {
					size = `${Measure.lengthFormat(l, Measure.LengthUnits.Feet)} (${Measure.lengthFormat(
						l,
						Measure.LengthUnits.Centimeter
					)})`
				} else {
					size = `${Measure.lengthFormat(l, Measure.LengthUnits.Yard)}/${Measure.lengthFormat(
						l,
						Measure.LengthUnits.Feet
					)} (${Measure.lengthFormat(l, Measure.LengthUnits.Meter)})`
				}
				return {
					modifier: m,
					name: i18n_f("gurps.modifier.size.size", { size: size }),
				}
			}),
		]

		const modifiersLocation: ModifierItem[] = [
			{ name: i18n("gurps.modifier.hit_location.eyes"), modifier: -9 },
			{ name: i18n("gurps.modifier.hit_location.skull"), modifier: -7 },
			{ name: i18n("gurps.modifier.hit_location.skull_behind"), modifier: -5 },
			{ name: i18n("gurps.modifier.hit_location.face"), modifier: -5 },
			{ name: i18n("gurps.modifier.hit_location.face_behind"), modifier: -7 },
			{ name: i18n("gurps.modifier.hit_location.nose"), modifier: -7 },
			{ name: i18n("gurps.modifier.hit_location.jaw"), modifier: -6 },
			{ name: i18n("gurps.modifier.hit_location.neck_vein"), modifier: -8 },
			{ name: i18n("gurps.modifier.hit_location.limb_vein"), modifier: -5 },
			{ name: i18n("gurps.modifier.hit_location.arm_shield"), modifier: -4 },
			{ name: i18n("gurps.modifier.hit_location.arm"), modifier: -2 },
			{ name: i18n("gurps.modifier.hit_location.torso"), modifier: 0 },
			{ name: i18n("gurps.modifier.hit_location.vitals"), modifier: -3 },
			{ name: i18n("gurps.modifier.hit_location.heart"), modifier: -5 },
			{ name: i18n("gurps.modifier.hit_location.groin"), modifier: -3 },
			{ name: i18n("gurps.modifier.hit_location.leg"), modifier: -2 },
			{ name: i18n("gurps.modifier.hit_location.hand"), modifier: -4 },
			{ name: i18n("gurps.modifier.hit_location.foot"), modifier: -4 },
			{ name: i18n("gurps.modifier.hit_location.neck"), modifier: -5 },
			{ name: i18n("gurps.modifier.hit_location.chinks_torso"), modifier: -8 },
			{ name: i18n("gurps.modifier.hit_location.chinks_other"), modifier: -10 },
		]

		const modifiersCover: ModifierItem[] = [
			{ name: i18n("gurps.modifier.cover.cover"), title: true },
			{ name: i18n("gurps.modifier.cover.head_only"), modifier: -5 },
			{ name: i18n("gurps.modifier.cover.head_and_shoulders"), modifier: -4 },
			{ name: i18n("gurps.modifier.cover.half_exposed"), modifier: -3 },
			{ name: i18n("gurps.modifier.cover.light_cover"), modifier: -2 },
			{ name: i18n("gurps.modifier.cover.same_sized_figure"), modifier: -4 },
			{ name: i18n("gurps.modifier.cover.prone_no_cover"), modifier: -4 },
			{ name: i18n("gurps.modifier.cover.prone_head_up"), modifier: -5 },
			{ name: i18n("gurps.modifier.cover.prone_head_down"), modifier: -7 },
			{ name: i18n("gurps.modifier.cover.crouching_no_cover"), modifier: -2 },
			{ name: i18n("gurps.modifier.cover.occupied_hex"), modifier: -4 },
			{ name: i18n("gurps.modifier.cover.posture"), title: true },
			{ name: i18n("gurps.modifier.cover.melee_crawling"), modifier: -4 },
			{ name: i18n("gurps.modifier.cover.ranged_sitting"), modifier: -2 },
			{ name: i18n("gurps.modifier.cover.defense_crawling"), modifier: -3 },
			{ name: i18n("gurps.modifier.cover.melee_crouching"), modifier: -2 },
			{ name: i18n("gurps.modifier.cover.ranged_crouching"), modifier: -2 },
			{ name: i18n("gurps.modifier.cover.hit_ranged_crouching"), modifier: -2 },
			{ name: i18n("gurps.modifier.cover.melee_kneeling"), modifier: -2 },
			{ name: i18n("gurps.modifier.cover.defense_kneeling"), modifier: -2 },
		]

		const modifiersDifficulty: ModifierItem[] = [
			{ name: i18n("gurps.modifier.task_difficulty.automatic"), modifier: 10 },
			{ name: i18n("gurps.modifier.task_difficulty.trivial"), modifier: 8 },
			{ name: i18n("gurps.modifier.task_difficulty.very_easy"), modifier: 6 },
			{ name: i18n("gurps.modifier.task_difficulty.easy"), modifier: 4 },
			{ name: i18n("gurps.modifier.task_difficulty.very_favorable"), modifier: 2 },
			{ name: i18n("gurps.modifier.task_difficulty.favorable"), modifier: 1 },
			{ name: i18n("gurps.modifier.task_difficulty.unfavorable"), modifier: -1 },
			{ name: i18n("gurps.modifier.task_difficulty.very_unfavorable"), modifier: -2 },
			{ name: i18n("gurps.modifier.task_difficulty.hard"), modifier: -4 },
			{ name: i18n("gurps.modifier.task_difficulty.very_hard"), modifier: -6 },
			{ name: i18n("gurps.modifier.task_difficulty.dangerous"), modifier: -8 },
			{ name: i18n("gurps.modifier.task_difficulty.impossible"), modifier: -10 },
		]

		const modifiersQuality: ModifierItem[] = [
			{ name: i18n("gurps.modifier.equipment_quality.best_possible"), modifier: -10 },
			{ name: i18n("gurps.modifier.equipment_quality.best_possible"), modifier: 4 },
			{ name: i18n("gurps.modifier.equipment_quality.fine"), modifier: 2 },
			{ name: i18n("gurps.modifier.equipment_quality.good"), modifier: 1 },
			{ name: i18n("gurps.modifier.equipment_quality.improvised"), modifier: -2 },
			{ name: i18n("gurps.modifier.equipment_quality.improvised_tech"), modifier: -5 },
			{ name: i18n("gurps.modifier.equipment_quality.missing"), modifier: -1 },
			{ name: i18n("gurps.modifier.equipment_quality.none"), modifier: -5 },
			{ name: i18n("gurps.modifier.equipment_quality.none_tech"), modifier: -10 },
		]

		const modifiersLighting: ModifierItem[] = [
			{ name: i18n("gurps.modifier.light.torch"), modifier: -1 },
			{ name: i18n("gurps.modifier.light.flashlight"), modifier: -2 },
			{ name: i18n("gurps.modifier.light.candlelight"), modifier: -3 },
			{ name: i18n("gurps.modifier.light.full_moon"), modifier: -4 },
			{ name: i18n("gurps.modifier.light.half_moon"), modifier: -5 },
			{ name: i18n("gurps.modifier.light.quarter_moon"), modifier: -6 },
			{ name: i18n("gurps.modifier.light.starlight"), modifier: -7 },
			{ name: i18n("gurps.modifier.light.starlight_clouds"), modifier: -8 },
			{ name: i18n("gurps.modifier.light.moonless"), modifier: -9 },
			{ name: i18n("gurps.modifier.light.total_darkness"), modifier: -10 },
		]

		const modifiersRof: ModifierItem[] = [
			...[
				[1, "5-8"],
				[2, "9-12"],
				[3, "13-15"],
				[4, "17-24"],
				[5, "25-49"],
				[6, "50-99"],
			].map(([m, l]) => {
				return { name: i18n_f("gurps.modifier.rof.rof", { rof: l }), modifier: Number(m) }
			}),
		]

		const common_modifiers: { title: string; items: ModifierItem[]; open?: boolean }[] = [
			{
				title: i18n("gurps.modifier.status.title"),
				items: modifiersStatus,
			},
			{
				title: i18n("gurps.modifier.speed.title"),
				items: modifiersSpeed,
			},
			{
				title: i18n("gurps.modifier.size.title"),
				items: modifiersSize,
			},
			{
				title: i18n("gurps.modifier.hit_location.title"),
				items: modifiersLocation,
			},
			{
				title: i18n("gurps.modifier.cover.title"),
				items: modifiersCover,
			},
			{
				title: i18n("gurps.modifier.task_difficulty.title"),
				items: modifiersDifficulty,
			},
			{
				title: i18n("gurps.modifier.equipment_quality.title"),
				items: modifiersQuality,
			},
			{
				title: i18n("gurps.modifier.light.title"),
				items: modifiersLighting,
			},
			{
				title: i18n("gurps.modifier.rof.title"),
				items: modifiersRof,
			},
		]

		common_modifiers.forEach((e, i) => {
			e.open = this.categoriesOpen[i]
		})

		const genericMods = [-5, -4, -3, -2, -1, +1, +2, +3, +4, +5].map(e => {
			return { modifier: e }
		})

		const players = (game as Game).users ?? []

		// Const common_modifiers: any[] = []
		return mergeObject(super.getData(options), {
			value: this.value,
			players: players,
			meleeMods: meleeMods,
			rangedMods: rangedMods,
			defenseMods: defenseMods,
			currentMods: modStack,
			commonMods: common_modifiers,
			genericMods: genericMods,
		})
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)

		// Get position
		const button = $("#modifier-app")
		// Const buttonTop = button.offset()?.top ?? 0; // might use position() depending on as yet unencountered issues
		// const buttonLeft = button.offset()?.left ?? 0;
		const buttonTop = button.position()?.top ?? 0
		const buttonLeft = (button.position()?.left || 0) + 220 ?? 0
		let buttonWidth = parseFloat(button.css("width").replace("px", ""))
		// Let width = parseFloat(html.find(".searchbar").css("width").replace("px", ""));
		// const width = 900
		const width = html.width() || 640
		let height = parseFloat(html.css("height").replace("px", ""))

		let left = Math.max(buttonLeft + buttonWidth / 2 - width / 2, 10)
		html.css("left", `${left}px`)
		html.css("top", `${buttonTop - height - 10}px`)

		// Focus the textbox on show
		const searchbar = html.find(".searchbar")
		searchbar.trigger("focus")

		// Detect changes to input
		searchbar.on("keydown", event => this._keyDown(event))

		// Modifier Deleting
		html.find(".active").on("click", event => this.removeModifier(event))
		html.find(".player").on("click", event => this.sendToPlayer(event))
		html.find(".modifier").on("click", event => this._onClickModifier(event))
		html.find(".collapsible").on("click", event => this._onCollapseToggle(event))
	}

	protected async _onCollapseToggle(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()
		const index = parseInt($(event.currentTarget).find(".dropdown-toggle").data("index"))
		this.categoriesOpen[index] = !this.categoriesOpen[index]
		return this.render()
	}

	_keyDown(event: JQuery.KeyDownEvent) {
		const value = ($(event.currentTarget).val() as string) ?? ""
		const customMod: RollModifier = { name: "", modifier: 0, tags: [] }
		const modifierMatch = value.match(/[-+]?[0-9]+\s*/)
		if (modifierMatch) {
			customMod.modifier = parseInt(modifierMatch[0]) ?? 0
			customMod.name = value.replace(modifierMatch[0], "")
		} else {
			customMod.modifier = 0
			customMod.name = value
		}
		if (["Enter", "Escape"].includes(event.key)) {
			event.preventDefault()
			switch (event.key) {
				case "Enter":
					return this.addModifier(customMod)
				case "Escape":
					return this.close()
			}
		}
	}

	_onClickModifier(event: JQuery.ClickEvent) {
		event.preventDefault()
		const modifier: RollModifier = {
			name: $(event.currentTarget).data("name"),
			modifier: $(event.currentTarget).data("modifier"),
		}
		return this.addModifier(modifier)
	}

	removeModifier(event: JQuery.ClickEvent) {
		event.preventDefault()
		const modList: RollModifier[] =
			((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
		const index = $(event.currentTarget).data("index")
		modList.splice(index, 1)
		;(game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList)
		this.render()
		this.button.render()
	}

	togglePin(customMod: RollModifier) {
		const pinnedMods: RollModifier[] =
			((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierPinned) as RollModifier[]) ?? []
		const matchingMod = pinnedMods.find(e => e.name === customMod.name)
		if (matchingMod) {
			pinnedMods.splice(pinnedMods.indexOf(matchingMod), 1)
		} else {
			pinnedMods.push(customMod)
		}
		;(game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierPinned, pinnedMods)
		this.render()
	}

	addModifier(mod: RollModifier) {
		const modList: RollModifier[] =
			((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
		const oldMod = modList.find(e => e.name === mod.name)
		if (oldMod) oldMod.modifier += mod.modifier
		else modList.push(mod)
		;(game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList)
		this.value = ""
		this.render()
		this.button.render()
	}

	async sendToPlayer(event: JQuery.ClickEvent) {
		event.preventDefault()
		const uuid = $(event.currentTarget).data("uuid")
		const player = (await fromUuid(uuid)) as User
		// Const player = (game as Game).users?.get(uuid)
		console.log(player)
		if (!player) return
		const modStack = (game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack)
		await player.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modStack)
		console.log(player, player.id)
		;(game as Game).socket?.emit("system.gcsga", { type: "updateBucket", users: [player.id] })
	}
}

interface ModifierBucket extends Application {
	button: any
	value: string
}

export { ModifierBucket }
