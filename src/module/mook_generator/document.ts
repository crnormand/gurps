import { SYSTEM_NAME } from "@module/data"
import { LocalizeGURPS } from "@util"

class MookGenerator extends Application {
	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			popOut: true,
			minimizable: true,
			resizable: true,
			width: 400,
			height: 400,
			id: "MookGenerator",
			template: `systems/${SYSTEM_NAME}/templates/mook_generator/sheet.hbs`,
			classes: ["mook-generator", "gurps"],
		})
	}

	get title(): string {
		return LocalizeGURPS.translations.gurps.system.mook_generator.title
	}

	static async init(): Promise<unknown> {
		const mg = new MookGenerator()
		return mg.render(true)
	}
}

export { MookGenerator }
