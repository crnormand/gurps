import { SYSTEM_NAME } from "@module/settings";
import { CompendiumBrowser, CompendiumIndexData } from "..";
import { CompendiumTab } from "./base";

export class CompendiumTraitTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/trait.hbs`;

	override get searchFields(): string[] {
		return [...super.searchFields, "adjustedPoints"];
	}

	constructor(browser: CompendiumBrowser) {
		super(browser, "trait");
	}

	protected override async loadData(): Promise<void> {
		const trait_list: CompendiumIndexData[] = [];
		const indexFields = ["img", "name", "system", "flags"];

		for await (const { pack, index } of this.browser.packLoader.loadPacks(
			"Item",
			this.browser.loadedPacks("trait"),
			indexFields
		)) {
			const collection = (game as Game).packs.get(pack.collection);
			((await collection?.getDocuments()) as any).forEach((trait: any) => {
				if (!["trait", "trait_container"].includes(trait.type)) return;
				trait.prepareData();
				const children = trait.type === "trait_container" ? trait.children : [];
				children.forEach((c: Item) => c.prepareData());
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
					children: trait.type === "trait_container" ? children : [],
					adjustedPoints: trait.adjustedPoints,
					tags: trait.tags,
					reference: trait.reference,
					enabled: true,
					parents: trait.parents,
					modifiers: trait.modifiers,
					cr: trait.cr,
					formattedCR: trait.formattedCR,
				});
			});

			// TODO: get rid of
			trait_list.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
		}

		this.indexData = trait_list;
	}
}
