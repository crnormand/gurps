import { ItemType, SYSTEM_NAME } from "@module/data"
import { CompendiumBrowser } from "../browser"
import { CompendiumIndexData, TabName } from "../data"
import { CompendiumTab } from "./base"

export class CompendiumNoteTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/note.hbs`

	constructor(browser: CompendiumBrowser) {
		super(browser, TabName.Note)
	}

	// Override get searchFields(): string[] {
	// 	return [...super.searchFields, "formattedText"]
	// }

	protected override async loadData(): Promise<void> {
		const note_list: CompendiumIndexData[] = []
		const indexFields = ["img", "name", "system", "flags"]

		for await (const { pack, index } of this.browser.packLoader.loadPacks(
			"Item",
			this.browser.loadedPacks(TabName.Note),
			indexFields
		)) {
			const collection = game.packs.get(pack.collection)
			;((await collection?.getDocuments()) as any).forEach((note: any) => {
				if (![ItemType.Note, ItemType.NoteContainer].includes(note.type)) return
				note.prepareData()
				const children = note.type === ItemType.NoteContainer ? note.children : []
				children.forEach((c: Item) => c.prepareData())
				// TODO: hasAllIndexFields
				note_list.push({
					_id: note._id,
					type: note.type,
					name: note.name,
					notes: note.notes,
					formattedText: note.formattedText,
					img: note.img,
					compendium: pack,
					open: note.open,
					id: note._id,
					uuid: note.uuid,
					children: note.type === ItemType.NoteContainer ? children : [],
					reference: note.reference,
					parents: note.parents,
					indent: note.indent,
					flags: note.flags,
				})
			})

			// TODO: get rid of
			note_list.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0))
		}
		this.indexData = note_list
	}
}
