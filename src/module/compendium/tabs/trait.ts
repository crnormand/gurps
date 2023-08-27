import { ItemType, SYSTEM_NAME } from "@module/data"
import { CompendiumBrowser } from "../browser"
import { CompendiumIndexData, TabName } from "../data"
import { CompendiumTab } from "./base"

export class CompendiumTraitTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/trait.hbs`

	override get searchFields(): string[] {
		return [...super.searchFields, "adjustedPoints"]
	}

	constructor(browser: CompendiumBrowser) {
		super(browser, TabName.Trait)
	}

	protected override async loadData(): Promise<void> {
		const trait_list: CompendiumIndexData[] = []
		const indexFields = ["img", "name", "system", "flags"]

		for await (const { pack, index } of this.browser.packLoader.loadPacks(
			"Item",
			this.browser.loadedPacks(TabName.Trait),
			indexFields
		)) {
			const collection = game.packs.get(pack.collection)
			;((await collection?.getDocuments()) as any).forEach((trait: any) => {
				if (![ItemType.Trait, ItemType.TraitContainer].includes(trait.type)) return
				trait.prepareData()
				const children = trait.type === ItemType.TraitContainer ? trait.children : []
				children.forEach((c: Item) => c.prepareData())
				// TODO: hasAllIndexFields
				trait_list.push({
					_id: trait._id,
					type: trait.type,
					name: trait.name,
					formattedName: trait.formattedName,
					notes: trait.notes,
					img: trait.img,
					compendium: pack,
					open: trait.open,
					id: trait._id,
					uuid: trait.uuid,
					children: trait.type === ItemType.TraitContainer ? children : [],
					adjustedPoints: trait.adjustedPoints,
					tags: trait.tags,
					reference: trait.reference,
					reference_highlight: trait.reference_highlight,
					enabled: true,
					parents: trait.parents,
					indent: trait.indent,
					modifiers: trait.modifiers,
					cr: trait.cr,
					formattedCR: trait.formattedCR,
					flags: trait.flags,
				})
			})

			// TODO: get rid of
			trait_list.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0))
		}

		this.indexData = trait_list
	}
}
