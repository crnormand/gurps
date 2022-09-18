import { EquipmentContainerGURPS } from "@item";
import { SYSTEM_NAME } from "@module/settings";
import { CompendiumBrowser, CompendiumIndexData } from "..";
import { CompendiumTab } from "./base";

export class CompendiumEquipmentTab extends CompendiumTab {
	override templatePath = `systems/${SYSTEM_NAME}/templates/compendium-browser/equipment.hbs`;

	override get searchFields(): string[] {
		return [...super.searchFields, "techLevel", "costDescription", "weightDescription"];
	}

	constructor(browser: CompendiumBrowser) {
		super(browser, "equipment");
	}

	protected override async loadData(): Promise<void> {
		const equipment_list: CompendiumIndexData[] = [];
		const indexFields = ["name", "system", "flags"];

		for await (const { pack, index } of this.browser.packLoader.loadPacks(
			"Item",
			this.browser.loadedPacks("equipment"),
			indexFields
		)) {
			const collection = (game as Game).packs.get(pack.collection);
			((await collection?.getDocuments()) as any).forEach((equipment: any) => {
				if (!["equipment", "equipment_container"].includes(equipment.type)) return;
				equipment.prepareData();
				equipment_list.push({
					_id: equipment._id,
					type: equipment.type,
					name: equipment.name,
					formattedName: equipment.formattedName,
					notes: equipment.notes,
					img: equipment.img,
					compendium: pack,
					open: equipment.open,
					uuid: equipment.uuid,
					id: equipment._id,
					children: equipment instanceof EquipmentContainerGURPS ? equipment.children : [],
					uses: equipment.maxUses,
					techLevel: equipment.techLevel,
					legalityClass: equipment.legalityClass,
					adjustedValue: equipment.adjustedValue,
					adjustedWeightFast: equipment.adjustedWeightFast,
					tags: equipment.tags,
					reference: equipment.reference,
					parents: equipment.parents,
					modifiers: equipment.modifiers,
				});
			});
		}
		equipment_list.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));

		this.indexData = equipment_list;
	}
}
