import { SYSTEM_NAME } from "@module/settings";
import { CompendiumBrowser, CompendiumIndexData } from "..";
import { CompendiumTab } from "./base";

export class CompendiumSkillTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/skill.hbs`;

	override get searchFields(): string[] {
		return [...super.searchFields, "system.difficulty"];
	}

	constructor(browser: CompendiumBrowser) {
		super(browser, "skill");
	}

	protected override async loadData(): Promise<void> {
		const skill_list: CompendiumIndexData[] = [];
		const indexFields = ["name", "system", "flags"];

		for await (const { pack, index } of this.browser.packLoader.loadPacks(
			"Item",
			this.browser.loadedPacks("skill"),
			indexFields
		)) {
			const collection = (game as Game).packs.get(pack.collection);
			((await collection?.getDocuments()) as any).forEach((skill: any) => {
				if (!["skill", "technique", "skill_container"].includes(skill.type)) return;
				let difficulty = "";
				if (skill.type === "skill")
					difficulty = `${skill.attribute.toUpperCase()}/${skill.difficulty.toUpperCase()}`;
				if (skill.type === "technique") difficulty = `Tech/${skill.difficulty.toUpperCase()}`;
				skill.prepareData();
				skill_list.push({
					_id: skill._id,
					type: skill.type,
					name: skill.name,
					formattedName: skill.formattedName,
					notes: skill.notes,
					img: skill.img,
					compendium: pack,
					open: skill.open,
					uuid: skill.uuid,
					id: skill._id,
					children: skill.type === "skill_container" ? skill.children : [],
					tags: skill.tags,
					reference: skill.reference,
					parents: skill.parents,
					difficulty: difficulty,
				});
			});
		}
		skill_list.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));

		this.indexData = skill_list;
	}
}
