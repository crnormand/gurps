import { SYSTEM_NAME } from "@module/settings";
import { CompendiumBrowser, CompendiumIndexData } from "..";
import { CompendiumTab } from "./base";

export class CompendiumTraitModifierTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/modifier.hbs`;

	override get searchFields(): string[] {
		return [...super.searchFields, "costDescription"];
	}

	constructor(browser: CompendiumBrowser) {
		super(browser, "modifier");
	}

	protected override async loadData(): Promise<void> {
		const modifier_list: CompendiumIndexData[] = [];
		const indexFields = ["img", "name", "system", "flags"];

		for await (const { pack, index } of this.browser.packLoader.loadPacks(
			"Item",
			this.browser.loadedPacks("modifier"),
			indexFields
		)) {
			const collection = (game as Game).packs.get(pack.collection);
			((await collection?.getDocuments()) as any).forEach((modifier: any) => {
				if (!["modifier", "modifier_container"].includes(modifier.type)) return;
				modifier.prepareData();
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
					children: modifier.type === "modifier_container" ? modifier.children : [],
					tags: modifier.tags,
					reference: modifier.reference,
					cost: modifier.costDescription,
				});
			});

			// TODO: get rid of
			modifier_list.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
		}

		this.indexData = modifier_list;
	}
}
