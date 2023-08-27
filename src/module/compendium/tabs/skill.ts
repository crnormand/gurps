import { ItemType, SYSTEM_NAME } from "@module/data"
import { CompendiumBrowser } from "../browser"
import { CompendiumIndexData, TabName } from "../data"
import { CompendiumTab } from "./base"

export class CompendiumSkillTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/skill.hbs`

	override get searchFields(): string[] {
		return [...super.searchFields, "system.difficulty"]
	}

	constructor(browser: CompendiumBrowser) {
		super(browser, TabName.Skill)
	}

	protected override async loadData(): Promise<void> {
		const skill_list: CompendiumIndexData[] = []
		const indexFields = ["name", "system", "flags"]

		for await (const { pack, index } of this.browser.packLoader.loadPacks(
			"Item",
			this.browser.loadedPacks(TabName.Skill),
			indexFields
		)) {
			const collection = game.packs.get(pack.collection)
			;((await collection?.getDocuments()) as any).forEach((skill: any) => {
				if (![ItemType.Skill, ItemType.Technique, ItemType.SkillContainer].includes(skill.type)) return
				let difficulty = ""
				if (skill.type === ItemType.Skill)
					difficulty = `${skill.attribute.toUpperCase()}/${skill.difficulty.toUpperCase()}`
				if (skill.type === ItemType.Technique) difficulty = `Tech/${skill.difficulty.toUpperCase()}`
				skill.prepareData()
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
					children: skill.type === ItemType.SkillContainer ? skill.children : [],
					tags: skill.tags,
					reference: skill.reference,
					reference_highlight: skill.reference_highlight,
					parents: skill.parents,
					indent: skill.indent,
					difficulty: difficulty,
					flags: skill.flags,
				})
			})
		}
		skill_list.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0))

		this.indexData = skill_list
	}
}
