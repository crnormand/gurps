/**
 * MIT License
 *
 * Copyright (c) 2022 Chris Normand
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
import { registerSettings, SYSTEM_NAME } from "./settings";
import { preloadTemplates } from "./preload-templates";
import { evaluateToNumber, i18n, registerHandlebarsHelpers } from "@util";
import { CharacterSheetGURPS } from "@actor/sheet";
import { BaseActorGURPS } from "@actor/base";
import { BaseItemGURPS } from "@item";
import { GURPSCONFIG } from "./config";
import { TraitSheet } from "@item/trait/sheet";
import { fSearch } from "@util/fuse";
import { DiceGURPS } from "./dice";
import * as Chat from "@module/chat";
import { TraitContainerSheet } from "@item/trait_container/sheet";
import { SkillSheet } from "@item/skill/sheet";
import { TraitModifierSheet } from "@item/trait_modifier/sheet";
import { TraitModifierContainerSheet } from "@item/trait_modifier_container/sheet";
import { EquipmentModifierContainerSheet } from "@item/equipment_modifier_container/sheet";
import { SpellContainerSheet } from "@item/spell_container/sheet";
import { SkillContainerSheet } from "@item/skill_container/sheet";
import { NoteContainerSheet } from "@item/note_container/sheet";
import { NoteSheet } from "@item/note/sheet";
import { TechniqueSheet } from "@item/technique/sheet";
import { EquipmentSheet } from "@item/equipment/sheet";
import { RitualMagicSpellSheet } from "@item/ritual_magic_spell/sheet";
import { SpellSheet } from "@item/spell/sheet";
import { EquipmentModifierSheet } from "@item/equipment_modifier/sheet";
import { ModifierButton } from "./mod_prompt/button";
import { ItemImporter } from "@item/import";
import { CompendiumBrowser } from "./compendium";
import { PDFViewerSheet } from "@module/pdf/sheet";
import { JournalEntryPageGURPS } from "./pdf";
import { PDFEditorSheet } from "./pdf/edit";
import { UserFlags } from "./data";
// Import { XMLtoJS } from "@util/xml_js";
// import { GCAImporter } from "@actor/character/import_GCA";

Error.stackTraceLimit = Infinity;

// TODO: make GURPS type concrete
export const GURPS: any = {};
if (!(globalThis as any).GURPS) {
	(globalThis as any).GURPS = GURPS;
	GURPS.DEBUG = true;
	GURPS.LEGAL =
		"GURPS is a trademark of Steve Jackson Games, and its rules and art are copyrighted by Steve Jackson Games.\nAll rights are reserved by Steve Jackson Games.\nThis game aid is the original creation of Mikolaj Tomczynski and is released for free distribution, and not for resale, under the permissions granted by\nhttp://www.sjgames.com/general/online_policy.html";
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
                                                                                       `;
	GURPS.eval = evaluateToNumber;
	GURPS.search = fSearch;
	GURPS.dice = DiceGURPS;
	GURPS.pdf = PDFViewerSheet;
}
// GURPS.XMLtoJS = XMLtoJS;
// GURPS.GCAImport = GCAImporter;

// Initialize system
Hooks.once("init", async () => {
	// CONFIG.debug.hooks = true;
	console.log(`${SYSTEM_NAME} | Initializing ${SYSTEM_NAME}`);
	console.log(`%c${GURPS.BANNER}`, "color:limegreen");
	console.log(`%c${GURPS.LEGAL}`, "color:yellow");

	const src = `systems/${SYSTEM_NAME}/assets/gurps4e.svg`;
	$("#logo").attr("src", src);
	// $("#logo").attr("width", "100px");

	// Assign custom classes and constants hereby
	(CONFIG as any).GURPS = GURPSCONFIG;
	(CONFIG.Item.documentClass as any) = BaseItemGURPS;
	CONFIG.Actor.documentClass = BaseActorGURPS;
	(CONFIG as any).JournalEntryPage.documentClass = JournalEntryPageGURPS;

	// Register custom system settings
	registerSettings();

	// Preload Handlebars templates
	await preloadTemplates();
	registerHandlebarsHelpers();

	// Register custom sheets (if any)
	Items.unregisterSheet("core", ItemSheet);
	Actors.unregisterSheet("core", ActorSheet);

	// @ts-ignore
	DocumentSheetConfig.unregisterSheet(JournalEntryPage, "core", JournalPDFPageSheet);

	Items.registerSheet(SYSTEM_NAME, TraitSheet, {
		types: ["trait"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.trait"),
	});
	Items.registerSheet(SYSTEM_NAME, TraitContainerSheet, {
		types: ["trait_container"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.trait_container"),
	});
	Items.registerSheet(SYSTEM_NAME, TraitModifierSheet, {
		types: ["modifier"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.modifier"),
	});
	Items.registerSheet(SYSTEM_NAME, TraitModifierContainerSheet, {
		types: ["modifier_container"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.modifier_container"),
	});
	Items.registerSheet(SYSTEM_NAME, SkillSheet, {
		types: ["skill"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.skill"),
	});
	Items.registerSheet(SYSTEM_NAME, TechniqueSheet, {
		types: ["technique"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.technique"),
	});
	Items.registerSheet(SYSTEM_NAME, SkillContainerSheet, {
		types: ["skill_container"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.skill_container"),
	});
	Items.registerSheet(SYSTEM_NAME, SpellSheet, {
		types: ["spell"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.spell"),
	});
	Items.registerSheet(SYSTEM_NAME, RitualMagicSpellSheet, {
		types: ["ritual_magic_spell"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.ritual_magic_spell"),
	});
	Items.registerSheet(SYSTEM_NAME, SpellContainerSheet, {
		types: ["spell_container"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.spell_container"),
	});
	Items.registerSheet(SYSTEM_NAME, EquipmentSheet, {
		types: ["equipment", "equipment_container"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.equipment"),
	});
	Items.registerSheet(SYSTEM_NAME, EquipmentModifierSheet, {
		types: ["eqp_modifier"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.eqp_modifier"),
	});
	Items.registerSheet(SYSTEM_NAME, EquipmentModifierContainerSheet, {
		types: ["eqp_modifier_container"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.eqp_modifier_container"),
	});
	Items.registerSheet(SYSTEM_NAME, NoteSheet, {
		types: ["note"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.note"),
	});
	Items.registerSheet(SYSTEM_NAME, NoteContainerSheet, {
		types: ["note_container"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.note_container"),
	});

	Actors.registerSheet(SYSTEM_NAME, CharacterSheetGURPS, {
		types: ["character_gcs"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.character"),
	});

	// //@ts-ignore
	// DocumentSheetConfig.registerSheet(JournalEntryPage, SYSTEM_NAME, PDFViewerSheet, {
	// 	types: ["pdf"],
	// 	makeDefault: true,
	// 	label: i18n("gurps.system.sheet.pdf"),
	// });

	// @ts-ignore
	DocumentSheetConfig.registerSheet(JournalEntryPage, SYSTEM_NAME, PDFEditorSheet, {
		types: ["pdf"],
		makeDefault: true,
		label: i18n("gurps.system.sheet.pdf_edit"),
	});
});

// Setup system
Hooks.once("setup", async () => {
	// Do anything after initialization but before ready
});

// When ready
Hooks.once("ready", async () => {
	// Do anything once the system is ready

	// Enable drag image
	const DRAG_IMAGE = document.createElement("div");
	DRAG_IMAGE.innerHTML = await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/drag-image.hbs`, {
		name: "",
		type: "",
	});
	DRAG_IMAGE.id = "drag-ghost";
	document.body.appendChild(DRAG_IMAGE);
	await Promise.all(
		(game as Game).actors!.map(async actor => {
			actor.prepareData();
		})
	);

	// Render modifier app after user object loaded to avoid old data
	(game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.Init, true);
	GURPS.ModifierButton = new ModifierButton();
	GURPS.ModifierButton.render(true);

	GURPS.CompendiumBrowser = new CompendiumBrowser();
});

// Add any additional hooks if necessary
Hooks.on("renderChatMessage", (_app, html, _data) => Chat.addChatListeners(html));

Hooks.on("renderSidebarTab", async (app: SidebarTab, html: JQuery<HTMLElement>) => {
	if (app.options.id === "compendium") {
		const importButton = $(
			`<button><i class='fas fa-file-import'></i>${i18n("gurps.system.library_import.button")}</button>`
		);
		importButton.on("click", _event => ItemImporter.showDialog());
		html.find(".directory-footer").append(importButton);

		const browseButton = $(
			`<button><i class='fas fa-book-open-cover'></i>${i18n("gurps.compendium_browser.button")}</button>`
		);
		browseButton.on("click", _event => GURPS.CompendiumBrowser.render(true));
		html.find(".directory-footer").append(browseButton);
	}
});

Hooks.on("updateCompendium", async (pack, _documents, _options, _userId) => {
	// Console.log(pack, documents, options, userId);
	// const uuids = documents.map((e: any) => e.uuid);
	const cb = GURPS.CompendiumBrowser;
	if (cb.rendered && cb.loadedPacks(cb.activeTab).includes(pack.collection)) {
		await cb.tabs[cb.activeTab].init();
		cb.render();
	}
	// Uuids.forEach(async (e: string) => {
	// 	console.log(e);
	// 	// const sheet = ((await fromUuid(e)) as Item)?.sheet;
	// 	// if (!sheet?.rendered) {
	// 	// 	sheet?.render(true);
	// 	// }
	// })
});
