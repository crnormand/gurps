import { ItemType, SYSTEM_NAME } from "@module/data"
import { CompendiumBrowser } from "../browser"
import { CompendiumIndexData, TabName } from "../data"
import { CompendiumTab } from "./base"

export class CompendiumEquipmentModifierTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/eqp_modifier.hbs`

	override get searchFields(): string[] {
		return [...super.searchFields, "techLevel", "costDescription", "weightDescription"]
	}

	constructor(browser: CompendiumBrowser) {
		super(browser, TabName.EquipmentModifier)
	}

	protected override async loadData(): Promise<void> {
		const modifier_list: CompendiumIndexData[] = []
		const indexFields = ["img", "name", "system", "flags"]

		for await (const { pack, index } of this.browser.packLoader.loadPacks(
			"Item",
			this.browser.loadedPacks(TabName.EquipmentModifier),
			indexFields
		)) {
			const collection = game.packs.get(pack.collection)
			;((await collection?.getDocuments()) as any).forEach((modifier: any) => {
				if (![ItemType.EquipmentModifier, ItemType.EquipmentModifierContainer].includes(modifier.type)) return
				modifier.prepareData()
				const children = modifier.type === ItemType.EquipmentModifierContainer ? modifier.children : []
				children.forEach((c: Item) => c.prepareData())
				// TODO: hasAllIndexFields
				modifier_list.push({
					_id: modifier._id,
					type: modifier.type,
					name: modifier.name,
					formattedName: modifier.formattedName,
					notes: modifier.notes,
					img: modifier.img,
					compendium: pack,
					open: modifier.open,
					uuid: modifier.uuid,
					id: modifier._id,
					parents: modifier.parents,
					indent: modifier.indent,
					children: modifier.type === ItemType.EquipmentModifierContainer ? children : [],
					adjustedPoints: modifier.adjustedPoints,
					tags: modifier.tags,
					reference: modifier.reference,
					techLevel: modifier.techLevel,
					value: modifier.costDescription,
					weight: modifier.weightDescription,
					flags: modifier.flags,
				})
			})

			// TODO: get rid of
			modifier_list.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0))
		}

		this.indexData = modifier_list
	}
}
