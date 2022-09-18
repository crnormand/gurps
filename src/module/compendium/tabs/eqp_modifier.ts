import { SYSTEM_NAME } from "@module/settings";
import { CompendiumBrowser, CompendiumIndexData } from "..";
import { CompendiumTab } from "./base";

export class CompendiumEquipmentModifierTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/eqp_modifier.hbs`;

	override get searchFields(): string[] {
		return [...super.searchFields, "techLevel", "costDescription", "weightDescription"];
	}

	constructor(browser: CompendiumBrowser) {
		super(browser, "eqp_modifier");
	}

	protected override async loadData(): Promise<void> {
		const modifier_list: CompendiumIndexData[] = [];
		const indexFields = ["img", "name", "system", "flags"];

		for await (const { pack, index } of this.browser.packLoader.loadPacks(
			"Item",
			this.browser.loadedPacks("eqp_modifier"),
			indexFields
		)) {
			const collection = (game as Game).packs.get(pack.collection);
			((await collection?.getDocuments()) as any).forEach((modifier: any) => {
				if (!["eqp_modifier", "eqp_modifier_container"].includes(modifier.type)) return;
				modifier.prepareData();
				const children = modifier.type === "eqp_modifier_container" ? modifier.children : [];
				children.forEach((c: Item) => c.prepareData());
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
					children: modifier.type === "eqp_modifier_container" ? children : [],
					adjustedPoints: modifier.adjustedPoints,
					tags: modifier.tags,
					reference: modifier.reference,
					techLevel: modifier.techLevel,
					value: modifier.costDescription,
					weight: modifier.weightDescription,
				});
			});

			// TODO: get rid of
			modifier_list.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
		}

		this.indexData = modifier_list;
	}
}
