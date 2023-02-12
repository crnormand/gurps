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
import {
	evaluateToNumber,
	getDefaultSkills,
	i18n,
	LastActor,
	registerHandlebarsHelpers,
	setInitiative,
	Static,
} from "@util"
import { BaseActorGURPS } from "@actor/base"
import { GURPSCONFIG } from "./config"
import { fSearch } from "@util/fuse"
import { DiceGURPS } from "@module/dice"
import * as Chat from "@module/chat"
import { ItemImporter } from "@item/import"
import { CompendiumBrowser } from "./compendium"
import { PDFViewerSheet } from "@module/pdf/sheet"
import { JournalEntryPageGURPS } from "./pdf"
import { PDFEditorSheet } from "./pdf/edit"
import { ActorType, ItemType, SOCKET, SYSTEM_NAME, UserFlags } from "./data"
import { TokenModifierControl } from "./token_modifier"
import { StaticHitLocation } from "@actor/static_character/hit_location"
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
import { CharacterSheetGURPS, StaticCharacterSheetGURPS } from "@actor"
import { DamageCalculator } from "./damage_calculator/damage_calculator"
import { ActiveEffectGURPS } from "@module/effect"

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
	GURPS.eval = evaluateToNumber
	GURPS.search = fSearch
	GURPS.dice = DiceGURPS
	GURPS.pdf = PDFViewerSheet
	GURPS.TokenModifierControl = new TokenModifierControl()
	GURPS.recurseList = Static.recurseList
	GURPS.setLastActor = LastActor.set
	GURPS.DamageCalculator = DamageCalculator
	GURPS.getDefaultSkills = getDefaultSkills
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
	CONFIG.Item.documentClass = BaseItemGURPS
	CONFIG.Actor.documentClass = BaseActorGURPS
	CONFIG.Token.documentClass = TokenDocumentGURPS
	CONFIG.Token.objectClass = TokenGURPS
	CONFIG.ActiveEffect.documentClass = ActiveEffectGURPS
	// @ts-ignore
	CONFIG.JournalEntryPage.documentClass = JournalEntryPageGURPS
	CONFIG.Combat.documentClass = CombatGURPS
	CONFIG.statusEffects = StatusEffectsGURPS
	CONFIG.Canvas.rulerClass = RulerGURPS

	CONFIG.Dice.rolls.unshift(RollGURPS)

	StaticHitLocation.init()

	// Register custom system settings
	registerSettings()

	// Preload Handlebars templates
	await preloadTemplates()
	registerHandlebarsHelpers()

	// Register custom sheets (if any)
	Items.unregisterSheet("core", ItemSheet)
	Actors.unregisterSheet("core", ActorSheet)

	// @ts-ignore
	DocumentSheetConfig.unregisterSheet(JournalEntryPage, "core", JournalPDFPageSheet)

	Items.registerSheet(SYSTEM_NAME, TraitSheet, {
		types: [ItemType.Trait],
		makeDefault: true,
		label: i18n("gurps.system.sheet.trait"),
	})
	Items.registerSheet(SYSTEM_NAME, TraitContainerSheet, {
		types: [ItemType.TraitContainer],
		makeDefault: true,
		label: i18n("gurps.system.sheet.trait_container"),
	})
	Items.registerSheet(SYSTEM_NAME, TraitModifierSheet, {
		types: [ItemType.TraitModifier],
		makeDefault: true,
		label: i18n("gurps.system.sheet.modifier"),
	})
	Items.registerSheet(SYSTEM_NAME, TraitModifierContainerSheet, {
		types: [ItemType.TraitModifierContainer],
		makeDefault: true,
		label: i18n("gurps.system.sheet.modifier_container"),
	})
	Items.registerSheet(SYSTEM_NAME, SkillSheet, {
		types: [ItemType.Skill],
		makeDefault: true,
		label: i18n("gurps.system.sheet.skill"),
	})
	Items.registerSheet(SYSTEM_NAME, TechniqueSheet, {
		types: [ItemType.Technique],
		makeDefault: true,
		label: i18n("gurps.system.sheet.technique"),
	})
	Items.registerSheet(SYSTEM_NAME, SkillContainerSheet, {
		types: [ItemType.SkillContainer],
		makeDefault: true,
		label: i18n("gurps.system.sheet.skill_container"),
	})
	Items.registerSheet(SYSTEM_NAME, SpellSheet, {
		types: [ItemType.Spell],
		makeDefault: true,
		label: i18n("gurps.system.sheet.spell"),
	})
	Items.registerSheet(SYSTEM_NAME, RitualMagicSpellSheet, {
		types: [ItemType.RitualMagicSpell],
		makeDefault: true,
		label: i18n("gurps.system.sheet.ritual_magic_spell"),
	})
	Items.registerSheet(SYSTEM_NAME, SpellContainerSheet, {
		types: [ItemType.SpellContainer],
		makeDefault: true,
		label: i18n("gurps.system.sheet.spell_container"),
	})
	Items.registerSheet(SYSTEM_NAME, EquipmentSheet, {
		types: [ItemType.Equipment, ItemType.EquipmentContainer],
		makeDefault: true,
		label: i18n("gurps.system.sheet.equipment"),
	})
	Items.registerSheet(SYSTEM_NAME, EquipmentModifierSheet, {
		types: [ItemType.EquipmentModifier],
		makeDefault: true,
		label: i18n("gurps.system.sheet.eqp_modifier"),
	})
	Items.registerSheet(SYSTEM_NAME, EquipmentModifierContainerSheet, {
		types: [ItemType.EquipmentModifierContainer],
		makeDefault: true,
		label: i18n("gurps.system.sheet.eqp_modifier_container"),
	})
	Items.registerSheet(SYSTEM_NAME, NoteSheet, {
		types: [ItemType.Note],
		makeDefault: true,
		label: i18n("gurps.system.sheet.note"),
	})
	Items.registerSheet(SYSTEM_NAME, NoteContainerSheet, {
		types: [ItemType.NoteContainer],
		makeDefault: true,
		label: i18n("gurps.system.sheet.note_container"),
	})
	Items.registerSheet(SYSTEM_NAME, WeaponSheet, {
		types: [ItemType.MeleeWeapon, ItemType.RangedWeapon],
		makeDefault: true,
		label: i18n("gurps.system.sheet.weapon"),
	})
	Items.registerSheet(SYSTEM_NAME, StaticItemSheet, {
		types: [ItemType.LegacyEquipment],
		makeDefault: true,
		label: i18n("gurps.system.sheet.static_equipment"),
	})

	Actors.registerSheet(SYSTEM_NAME, CharacterSheetGURPS, {
		types: [ActorType.Character],
		makeDefault: true,
		label: i18n("gurps.system.sheet.character"),
	})

	Actors.registerSheet(SYSTEM_NAME, StaticCharacterSheetGURPS, {
		types: [ActorType.LegacyCharacter],
		makeDefault: true,
		label: i18n("gurps.system.sheet.static_character"),
	})

	// @ts-ignore
	DocumentSheetConfig.registerSheet(JournalEntryPage, SYSTEM_NAME, PDFEditorSheet, {
		types: ["pdf"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.pdf_edit"),
	})
})

// Setup system
Hooks.once("setup", async () => {
	// Do anything after initialization but before ready
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
	game.ModifierButton = new ModifierButton()
	game.ModifierButton.render(true)
	game.CompendiumBrowser = new CompendiumBrowser()

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
				return game.ModifierButton.render(true)
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

Hooks.on("renderSidebarTab", async (app: SidebarTab, html: JQuery<HTMLElement>) => {
	if (app.options.id === "compendium") {
		const importButton = $(
			`<button><i class='fas fa-file-import'></i>${i18n("gurps.system.library_import.button")}</button>`
		)
		importButton.on("click", _event => ItemImporter.showDialog())
		html.find(".directory-footer").append(importButton)

		const browseButton = $(
			`<button><i class='fas fa-book-open-cover'></i>${i18n("gurps.compendium_browser.button")}</button>`
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
	async function updateLastActor() {
		GURPS.LastActor = await LastActor.get()
		GURPS.LastToken = await LastActor.getToken()
	}
	if (args.length > 1) {
		const a = args[0]?.actor
		if (a) {
			if (args[1]) LastActor.set(a, args[0].actor)
			else LastActor.clear(a)
			updateLastActor()
		}
	}
})

Hooks.on("renderActorSheetGURPS", (...args: any[]) => {
	async function updateLastActor() {
		GURPS.LastActor = await LastActor.get()
		GURPS.LastToken = await LastActor.getToken()
	}
	if (args.length) {
		let a = args[0]?.actor
		if (a) {
			LastActor.set(a, args[0])
			updateLastActor()
		}
	}
})

Hooks.on("updateCombat", EffectGURPS.updateCombat)
Hooks.on("renderTokenHUD", (_app: any, $html: JQuery<HTMLElement>, data: any) => {
	TokenHUDGURPS.onRenderTokenHUD($html[0]!, data)
})
