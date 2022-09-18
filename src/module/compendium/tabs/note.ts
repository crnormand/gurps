import { SYSTEM_NAME } from "@module/settings";
import { CompendiumBrowser } from "..";
import { CompendiumTab } from "./base";

export class CompendiumNoteTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/note.hbs`;

	constructor(browser: CompendiumBrowser) {
		super(browser, "note");
	}
}
