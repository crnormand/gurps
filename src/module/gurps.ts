/**
 * MIT License
 *
 * Copyright (c) 2023 Chris Normand
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * GURPS is a trademark of Steve Jackson Games, and its rules and art are copyrighted by Steve Jackson Games.
 * All rights are reserved by Steve Jackson Games.
 * This game aid is the original creation of Chris Normand and is released for free distribution,
 * and not for resale, under the permissions granted by
 * http://www.sjgames.com/general/online_policy.html
 */

// Import TypeScript modules
import { registerSettings } from "./settings"
import { preloadTemplates } from "./preload-templates"
import { getDefaultSkills, LastActor, LocalizeGURPS, setInitiative } from "@util"
import { registerHandlebarsHelpers } from "@util/handlebars-helpers"
import { GURPSCONFIG } from "./config"
import * as Chat from "@module/chat"
import { ItemImporter } from "@item/import"
import { CompendiumBrowser } from "./compendium"
import { ActorType, ItemType, SOCKET, SYSTEM_NAME, UserFlags } from "./data"
import { StaticHitLocation } from "@actor/static_character/hit_location"
import * as SpeedProviderGURPS from "./modules/drag_ruler"
import { ColorSettings } from "./settings/colors"
import { DamageChat } from "./damage_calculator/damage_chat_message"
import { RollGURPS } from "@module/roll"
import { ModifierButton } from "./mod_prompt/button"
import { loadModifiers } from "@module/mod_prompt/data"
import { CombatGURPS } from "@module/combat"
import { TokenHUDGURPS } from "./token/hud"
import { TokenDocumentGURPS, TokenGURPS } from "@module/token"
import { RulerGURPS } from "./ruler"
import {
	BaseItemGURPS,
	EffectGURPS,
	EffectPanel,
	EffectSheet,
	EquipmentModifierContainerSheet,
	EquipmentModifierSheet,
	EquipmentSheet,
	NoteContainerSheet,
	NoteSheet,
	RitualMagicSpellSheet,
	SkillContainerSheet,
	SkillSheet,
	SpellContainerSheet,
	SpellSheet,
	StaticItemSheet,
	StatusEffectsGURPS,
	TechniqueSheet,
	TraitContainerSheet,
	TraitModifierContainerSheet,
	TraitModifierSheet,
	TraitSheet,
	WeaponSheet,
} from "@item"
import { ActorSheetGURPS, BaseActorGURPS, CharacterSheetGURPS, LootSheetGURPS, StaticCharacterSheetGURPS } from "@actor"
import { ActiveEffectGURPS } from "@module/effect"
import { ModifierList } from "./mod_list"
import { PDF } from "@module/pdf"
import { UserGURPS } from "./user/document"
import { CombatantGURPS } from "./combatant"
import { parselink } from "./otf"
import { CombatTrackerGURPS } from "@ui"

Error.stackTraceLimit = Infinity

// TODO: make GURPS type concrete
export const GURPS: any = {}
if (!(globalThis as any).GURPS) {
	;(globalThis as any).GURPS = GURPS
	GURPS.DEBUG = true
	GURPS.LEGAL =
		"GURPS is a trademark of Steve Jackson Games, and its rules and art are copyrighted by Steve Jackson Games.\nAll rights are reserved by Steve Jackson Games.\nThis game aid is the original creation of Mikolaj Tomczynski and is released for free distribution, and not for resale, under the permissions granted by\nhttp://www.sjgames.com/general/online_policy.html"

	GURPS.BANNER = `
      .:~!!~:.        ...::  .:..:.   :..::::::.       .:..:::::..        :~7??!^.
    ?#@@&##&@@#J.     5@@&!  :&@@&.  .B@@@&##&@@@#7    ^&@@&#&&&@@&Y   :G@@@&&&@@@#J.
  ~&@@Y.     J@@7    ^@@P     G@@Y    7@@&     ^&@@5    B@@?    ^#@@# .@@@J     :@@@!
 ^@@@^              :@@B      G@@5    7@@#      J@@B    B@@?     ~@@@.:@@@#7^.   ^!
 B@@B       :^::^   &@@:      G@@5    7@@&~~~~!P@@#.    B@@?    ^&@@5  7&@@@@@@&BY~.
 G@@#       :&@@B  ^@@&       G@@5    7@@@#B&@@@5.      B@@J.~5&@@B^     .^?5B&@@@@@5
 :@@@7       G@@Y  :@@@:      G@@P    7@@&   P@@&:      B@@@&#P?^               .B@@@^
  ^&@@P.     G@@Y   Y@@&~     G@@5    7@@#    J@@@!     B@@J          P@@@.      5@@@:
    7#@@&P?!~&@@G    !&@@@#GPP@@@#    5@@@.    !@@@P.  .&@@Y          .5@@@B5JYG@@@&~
      .^?5GBBBGG5.     .~?JYY5YJJJ^  .JJJJ~     :JJY7  ~JJJJ.           .~YB#&&BP7:
                                                                                       `
	// GURPS.eval = evaluateToNumber
	// GURPS.search = fSearch
	// GURPS.dice = DiceGURPS
	// GURPS.pdf = PDF.PDFViewerSheet
	// GURPS.TokenModifierControl = new TokenModifierControl()
	// GURPS.recurseList = Static.recurseList
	// GURPS.setLastActor = LastActor.set
	// GURPS.DamageCalculator = DamageCalculator
	// GURPS.getDefaultSkills = getDefaultSkills
	// GURPS.roll = RollGURPS
	// GURPS.static = Static
	GURPS.parseLink = parselink
	GURPS.chat = Chat
}

// Initialize system
Hooks.once("init", async () => {
	// CONFIG.debug.hooks = true
	console.log(`${SYSTEM_NAME} | Initializing ${SYSTEM_NAME}`)
	console.log(`%c${GURPS.BANNER}`, "color:limegreen")
	console.log(`%c${GURPS.LEGAL}`, "color:yellow")

	const src = `systems/${SYSTEM_NAME}/assets/gurps4e.svg`
	$("#logo").attr("src", src)
	// $("#logo").attr("width", "100px");
	//
	CONFIG.GURPS = GURPSCONFIG

	// Assign custom classes and constants hereby
	CONFIG.User.documentClass = UserGURPS
	CONFIG.Item.documentClass = BaseItemGURPS
	CONFIG.Actor.documentClass = BaseActorGURPS
	CONFIG.Token.documentClass = TokenDocumentGURPS
	CONFIG.Token.objectClass = TokenGURPS
	CONFIG.ActiveEffect.documentClass = ActiveEffectGURPS
	CONFIG.JournalEntryPage.documentClass = PDF.JournalEntryPageGURPS
	CONFIG.Combat.documentClass = CombatGURPS
	CONFIG.statusEffects = StatusEffectsGURPS
	CONFIG.Canvas.rulerClass = RulerGURPS
	CONFIG.ui.combat = CombatTrackerGURPS
	CONFIG.Combatant.documentClass = CombatantGURPS

	CONFIG.Dice.rolls.unshift(RollGURPS)

	StaticHitLocation.init()
	SpeedProviderGURPS.init()

	// Register custom system settings
	registerSettings()

	// Preload Handlebars templates
	await preloadTemplates()
	registerHandlebarsHelpers()

	game.EffectPanel = new EffectPanel()

	// Register custom sheets (if any)
	Items.unregisterSheet("core", ItemSheet)
	Actors.unregisterSheet("core", ActorSheet)

	// @ts-ignore
	DocumentSheetConfig.unregisterSheet(JournalEntryPage, "core", JournalPDFPageSheet)

	Items.registerSheet(SYSTEM_NAME, TraitSheet, {
		types: [ItemType.Trait],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.trait"),
	})
	Items.registerSheet(SYSTEM_NAME, TraitContainerSheet, {
		types: [ItemType.TraitContainer],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.trait_container"),
	})
	Items.registerSheet(SYSTEM_NAME, TraitModifierSheet, {
		types: [ItemType.TraitModifier],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.modifier"),
	})
	Items.registerSheet(SYSTEM_NAME, TraitModifierContainerSheet, {
		types: [ItemType.TraitModifierContainer],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.modifier_container"),
	})
	Items.registerSheet(SYSTEM_NAME, SkillSheet, {
		types: [ItemType.Skill],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.skill"),
	})
	Items.registerSheet(SYSTEM_NAME, TechniqueSheet, {
		types: [ItemType.Technique],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.technique"),
	})
	Items.registerSheet(SYSTEM_NAME, SkillContainerSheet, {
		types: [ItemType.SkillContainer],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.skill_container"),
	})
	Items.registerSheet(SYSTEM_NAME, SpellSheet, {
		types: [ItemType.Spell],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.spell"),
	})
	Items.registerSheet(SYSTEM_NAME, RitualMagicSpellSheet, {
		types: [ItemType.RitualMagicSpell],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.ritual_magic_spell"),
	})
	Items.registerSheet(SYSTEM_NAME, SpellContainerSheet, {
		types: [ItemType.SpellContainer],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.spell_container"),
	})
	Items.registerSheet(SYSTEM_NAME, EquipmentSheet, {
		types: [ItemType.Equipment, ItemType.EquipmentContainer],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.equipment"),
	})
	Items.registerSheet(SYSTEM_NAME, EquipmentModifierSheet, {
		types: [ItemType.EquipmentModifier],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.eqp_modifier"),
	})
	Items.registerSheet(SYSTEM_NAME, EquipmentModifierContainerSheet, {
		types: [ItemType.EquipmentModifierContainer],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.eqp_modifier_container"),
	})
	Items.registerSheet(SYSTEM_NAME, NoteSheet, {
		types: [ItemType.Note],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.note"),
	})
	Items.registerSheet(SYSTEM_NAME, NoteContainerSheet, {
		types: [ItemType.NoteContainer],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.note_container"),
	})
	Items.registerSheet(SYSTEM_NAME, WeaponSheet, {
		types: [ItemType.MeleeWeapon, ItemType.RangedWeapon],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.weapon"),
	})
	Items.registerSheet(SYSTEM_NAME, EffectSheet, {
		types: [ItemType.Effect, ItemType.Condition],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.effect"),
	})
	Items.registerSheet(SYSTEM_NAME, StaticItemSheet, {
		types: [ItemType.LegacyEquipment],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.static_equipment"),
	})

	Actors.registerSheet(SYSTEM_NAME, CharacterSheetGURPS, {
		types: [ActorType.Character],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.character_gcs"),
	})
	Actors.registerSheet(SYSTEM_NAME, LootSheetGURPS, {
		types: [ActorType.Loot],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.loot"),
	})
	Actors.registerSheet(SYSTEM_NAME, StaticCharacterSheetGURPS, {
		types: [ActorType.LegacyCharacter, ActorType.LegacyEnemy],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.character"),
	})

	// @ts-ignore
	DocumentSheetConfig.registerSheet(JournalEntryPage, SYSTEM_NAME, PDF.PDFEditorSheet, {
		types: ["pdf"],
		makeDefault: true,
		label: game.i18n.localize("gurps.system.sheet.pdf_edit"),
	})

	LocalizeGURPS.ready = true
})

// Setup system
Hooks.once("setup", async () => {
	// LocalizeGURPS.ready = true
	// Do anything after initialization but before ready

	game.ModifierButton = new ModifierButton()
	game.ModifierButton.render(true)
	game.ModifierList = new ModifierList()
	game.ModifierList.render(true)
	game.CompendiumBrowser = new CompendiumBrowser()
})

// When ready
Hooks.once("ready", async () => {
	// Do anything once the system is ready
	ColorSettings.applyColors()
	loadModifiers()
	getDefaultSkills()

	// ApplyDiceCSS()

	// Enable drag image
	const DRAG_IMAGE = document.createElement("div")
	DRAG_IMAGE.innerHTML = await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/drag-image.hbs`, {
		name: "",
		type: "",
	})
	DRAG_IMAGE.id = "drag-ghost"
	document.body.appendChild(DRAG_IMAGE)

	// Set default user flag state
	if (!game.user?.getFlag(SYSTEM_NAME, UserFlags.Init)) {
		game.user?.setFlag(SYSTEM_NAME, UserFlags.LastStack, [])
		game.user?.setFlag(SYSTEM_NAME, UserFlags.LastTotal, 0)
		game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, [])
		game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierTotal, 0)
		game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierSticky, false)
		game.user?.setFlag(SYSTEM_NAME, UserFlags.Init, true)
	}
	if (canvas && canvas.hud) {
		canvas.hud.token = new TokenHUDGURPS()
	}

	// Set initial LastActor values
	GURPS.LastActor = await LastActor.get()
	GURPS.LastToken = await LastActor.getToken()

	CONFIG.Combat.initiative.decimals = 5
	setInitiative()

	game.socket?.on("system.gcsga", async (response: any) => {
		console.log(response)
		switch (response.type as SOCKET) {
			case SOCKET.UPDATE_BUCKET:
				// Ui.notifications?.info(response.users)
				await game.ModifierList.render()
				return game.ModifierButton.render()
			case SOCKET.INITIATIVE_CHANGED:
				CONFIG.Combat.initiative.formula = response.formula
			default:
				return console.error("Unknown socket:", response.type)
		}
	})

	// Render modifier app after user object loaded to avoid old data
})

// Add any additional hooks if necessary
Hooks.on("renderChatMessage", (_app, html, _data) => Chat.addChatListeners(html))
Hooks.on("renderChatMessage", DamageChat.renderChatMessage)
Hooks.on("dropCanvasData", DamageChat.handleDropOnCanvas)

Hooks.on("canvasReady", () => {
	game.EffectPanel.render(true)
})

Hooks.on("renderSidebarTab", async (app: SidebarTab, html: JQuery<HTMLElement>) => {
	if (app.options.id === "compendium") {
		const importButton = $(
			`<button><i class='fas fa-file-import'></i>${LocalizeGURPS.translations.gurps.system.library_import.button}</button>`
		)
		importButton.on("click", _event => ItemImporter.showDialog())
		html.find(".directory-footer").append(importButton)

		const browseButton = $(
			`<button><i class='fas fa-book-open-cover'></i>${LocalizeGURPS.translations.gurps.compendium_browser.button}</button>`
		)
		browseButton.on("click", _event => game.CompendiumBrowser.render(true))
		html.find(".directory-footer").append(browseButton)
	}
})

Hooks.on("updateCompendium", async (pack, _documents, _options, _userId) => {
	const cb = game.CompendiumBrowser
	if (cb.rendered && cb.loadedPacks(cb.activeTab).includes(pack.collection)) {
		await cb.tabs[cb.activeTab].init()
		cb.render()
	}
})

Hooks.on("controlToken", async (...args: any[]) => {
	if (args.length > 1) {
		const a = args[0]?.actor
		if (a) {
			if (args[1]) await LastActor.set(a, args[0])
			else await LastActor.clear(a)
			GURPS.LastActor = await LastActor.get()
			GURPS.LastToken = await LastActor.getToken()
		}
	}
})

Hooks.on("renderActorSheetGURPS", async (...args: any[]) => {
	if (args.length) {
		let a = args[0]?.actor
		if (a) {
			await LastActor.set(a, args[0])
			GURPS.LastActor = await LastActor.get()
			GURPS.LastToken = await LastActor.getToken()
		}
	}
})

Hooks.on("targetToken", async () => {
	if (game.ModifierList) await game.ModifierList?.render(true)
})
Hooks.on("userConnected", async () => {
	if (game.ModifierList) await game.ModifierList?.render(true)
})

Hooks.on("updateCombat", EffectGURPS.updateCombat)
Hooks.on("renderTokenHUD", (_app: any, $html: JQuery<HTMLElement>, data: any) => {
	TokenHUDGURPS.onRenderTokenHUD($html[0]!, data)
})

Hooks.on("renderDialog", (_dialog: any, html: JQuery<HTMLElement>) => {
	const element = html[0]
	function extractOptGroup(select: HTMLSelectElement, label: string, types?: string[]): HTMLOptGroupElement {
		const options = select.querySelectorAll<HTMLOptionElement>(":scope > option")
		const filtered = [...options.values()].filter(option => !types || types.includes(option.value))
		const optgroup = document.createElement("optgroup")
		optgroup.label = label
		for (const element of filtered) {
			optgroup.appendChild(element)
		}

		return optgroup
	}
	if (element.classList.contains("dialog-item-create")) {
		const select = element.querySelector<HTMLSelectElement>("select[name=type]")
		const categories = LocalizeGURPS.translations.gurps.item.creation_dialog.categories
		if (select) {
			select.append(
				extractOptGroup(select, categories.trait, [
					ItemType.Trait,
					ItemType.TraitContainer,
					ItemType.TraitModifier,
					ItemType.TraitModifierContainer,
				])
			)
			select.append(
				extractOptGroup(select, categories.skill, [ItemType.Skill, ItemType.Technique, ItemType.SkillContainer])
			)
			select.append(
				extractOptGroup(select, categories.spell, [
					ItemType.Spell,
					ItemType.RitualMagicSpell,
					ItemType.SpellContainer,
				])
			)
			select.append(
				extractOptGroup(select, categories.equipment, [
					ItemType.Equipment,
					ItemType.EquipmentContainer,
					ItemType.EquipmentModifier,
					ItemType.EquipmentModifierContainer,
				])
			)
			select.append(extractOptGroup(select, categories.note, [ItemType.Note, ItemType.NoteContainer]))
			select.append(extractOptGroup(select, categories.weapon, [ItemType.MeleeWeapon, ItemType.RangedWeapon]))
			select.append(extractOptGroup(select, categories.effect, [ItemType.Effect]))
			select.append(extractOptGroup(select, categories.legacy, [ItemType.LegacyEquipment]))
		}
	}
})

Hooks.on("updateToken", function () {
	game.ModifierList.render(true)
})

Hooks.once("item-piles-ready", async function () {
	;(game as any).itempiles.API.addSystemIntegration({
		VERSION: "1.0.0",

		// The actor class type is the type of actor that will be used for the default
		// item pile actor that is created on first item drop.
		ACTOR_CLASS_TYPE: ActorType.Loot,

		// The item quantity attribute is the path to the attribute
		// on items that denote how many of that item that exists
		ITEM_QUANTITY_ATTRIBUTE: "system.quantity",

		// The item price attribute is the path to the attribute
		// on each item that determine how much it costs
		ITEM_PRICE_ATTRIBUTE: "system.value",

		// Item types and the filters actively remove items from the item
		// pile inventory UI that users cannot loot, such as spells, feats, and classes
		ITEM_FILTERS: [
			{
				path: "type",
				filters: [
					ItemType.Trait,
					ItemType.TraitContainer,
					ItemType.TraitModifier,
					ItemType.TraitModifierContainer,
					ItemType.Skill,
					ItemType.Technique,
					ItemType.SkillContainer,
					ItemType.Spell,
					ItemType.RitualMagicSpell,
					ItemType.SpellContainer,
					ItemType.EquipmentModifier,
					ItemType.EquipmentModifierContainer,
					ItemType.Note,
					ItemType.NoteContainer,
					ItemType.LegacyEquipment,
					ItemType.Effect,
					ItemType.Condition,
					ItemType.MeleeWeapon,
					ItemType.RangedWeapon,
				].join(","),
			},
		],

		UNSTACKABLE_ITEM_TYPES: [ItemType.EquipmentContainer],

		// Item similarities determines how item piles detect similarities and differences in the system
		ITEM_SIMILARITIES: ["name", "type"],

		// Currencies in item piles is a versatile system that can
		// accept actor attributes (a number field on the actor's sheet)
		// or items (actual items in their inventory)
		// In the case of attributes, the path is relative to the "actor.system"
		// In the case of items, it is recommended you export the item
		// with `.toObject()` and strip out any module data
		CURRENCIES: [],
	})
})

Hooks.on("dropCanvasData", async function (_canvas, data: any) {
	const dropTarget = [...(canvas!.tokens!.placeables as TokenGURPS[])]
		.sort((a, b) => b.document.sort - a.document.sort)
		.find(token => {
			const maximumX = token.x + (token.hitArea?.right ?? 0)
			const maximumY = token.y + (token.hitArea?.bottom ?? 0)
			return data.x >= token.x && data.y >= token.y && data.x <= maximumX && data.y <= maximumY
		})

	const actor = dropTarget?.actor
	if (actor && data.type === "Item") {
		await (actor.sheet as ActorSheetGURPS).emulateItemDrop(data as any)
		return false
	}
})

Hooks.on("renderPlayerList", function (_hotbar: any, element: JQuery<HTMLElement>, _options: any) {
	if (!game.ModifierList) return
	game.ModifierButton._injectHTML(element.parent("#interface"))
	game.ModifierList.render()
})

Hooks.on("renderHotbar", function (_hotbar: any, element: JQuery<HTMLElement>, _options: any) {
	if (!game.ModifierButton) return
	game.ModifierButton._injectHTML(element.parent("#ui-bottom"))
	game.ModifierButton.render()
})

Hooks.on("chatMessage", function (_chatlog: ChatLog, message: string, _data: any) {
	console.log("checkem")
	Chat.procesMessage(message)
	return false
})
