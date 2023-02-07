import { SYSTEM_NAME } from "@module/data"
import { CompendiumBrowser } from ".."
import { TabName } from "../data"
import { CompendiumTab } from "./base"

export class CompendiumNoteTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/note.hbs`

	constructor(browser: CompendiumBrowser) {
		super(browser, TabName.Note)
	}
}
