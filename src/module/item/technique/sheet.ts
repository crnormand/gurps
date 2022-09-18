import { ItemSheetGURPS } from "@item/base/sheet";

export class TechniqueSheet extends ItemSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(["technique"]),
		});
		return options;
	}

	getData(options?: Partial<DocumentSheetOptions> | undefined) {
		const sheetData = {
			...super.getData(options),
			...{
				attributes: {
					...{ 10: "10" },
					...super.getData(options).attributes,
					...{ skill: "Skill" },
				},
			},
		};
		return sheetData;
	}
}
