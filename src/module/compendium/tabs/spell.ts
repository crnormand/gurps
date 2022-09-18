import { SYSTEM_NAME } from "@module/settings";
import { CompendiumBrowser, CompendiumIndexData } from "..";
import { CompendiumTab } from "./base";

export class CompendiumSpellTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/spell.hbs`;

	override get searchFields(): string[] {
		return [
			...super.searchFields,
			"system.difficulty",
			"system.resist",
			"system.spell_class",
			"system.casting_cost",
			"system.maintenance_cost",
			"system.casting_time",
			"system.duration",
		];
	}

	constructor(browser: CompendiumBrowser) {
		super(browser, "spell");
	}

	protected override async loadData(): Promise<void> {
		const spell_list: CompendiumIndexData[] = [];
		const indexFields = ["img", "name", "system", "flags"];

		for await (const { pack, index } of this.browser.packLoader.loadPacks(
			"Item",
			this.browser.loadedPacks("spell"),
			indexFields
		)) {
			const collection = (game as Game).packs.get(pack.collection);
			((await collection?.getDocuments()) as any).forEach((spell: any) => {
				if (!["spell", "spell_container"].includes(spell.type)) return;
				spell.prepareData();
				// TODO: hasAllIndexFields
				spell_list.push({
					_id: spell._id,
					type: spell.type,
					name: spell.name,
					formattedName: spell.formattedName,
					notes: spell.notes,
					img: spell.img,
					compendium: pack,
					open: spell.open,
					uuid: spell.uuid,
					id: spell._id,
					children: spell.type === "spell_container" ? spell.children : [],
					adjustedPoints: spell.adjustedPoints,
					tags: spell.tags,
					reference: spell.reference,
					parents: spell.parents,
					college: spell.system.college,
					resist: spell.system.resist,
					spell_class: spell.system.spell_class,
					casting_cost: spell.system.casting_cost,
					maintenance_cost: spell.system.maintenance_cost,
					casting_time: spell.system.casting_time,
					duration: spell.system.duration,
					difficulty: `${spell.attribute.toUpperCase()}/${spell.difficulty.toUpperCase()}`,
				});
			});

			// TODO: get rid of
			spell_list.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
		}

		this.indexData = spell_list;
	}
}
