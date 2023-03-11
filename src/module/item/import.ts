import { ItemSystemDataGURPS } from "@module/config"
import { SYSTEM_NAME } from "@module/data"
import { LocalizeGURPS } from "@util"
import { ImportUtils } from "@util/import"

interface ItemLibraryData {
	type: ItemLibraryType
	version: number
	rows: Array<ItemSystemDataGURPS>
}

enum ItemLibraryType {
	TraitLibrary = "trait_list",
	TraitModifierLibrary = "modifier_list",
	SkillLibrary = "skill_list",
	SpellLibrary = "spell_list",
	EquipmentLibrary = "equipment_list",
	EquipmentModifierLibrary = "eqp_modifier_list",
	NoteLibrary = "note_list",
}

export class ItemImporter {
	version: number

	constructor() {
		this.version = 4
	}

	static showDialog() {
		setTimeout(async () => {
			new Dialog(
				{
					title: LocalizeGURPS.translations.gurps.system.library_import.title,
					content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/library-import.hbs`, {}),
					buttons: {
						import: {
							icon: '<i class="fas fa-file-import"></i>',
							label: LocalizeGURPS.translations.gurps.system.library_import.import,
							callback: (html: HTMLElement | JQuery<HTMLElement>) => {
								const form = $(html).find("form")[0]
								const files = form.data.files
								if (!files.length)
									return ui.notifications?.error(
										LocalizeGURPS.translations.gurps.error.import.no_file
									)
								else {
									const file = files[0]
									readTextFromFile(file).then(text =>
										ItemImporter.import({
											text: text,
											name: file.name,
											path: file.path,
										})
									)
								}
							},
						},
						no: {
							icon: '<i class="fas fa-times"></i>',
							label: LocalizeGURPS.translations.gurps.system.library_import.cancel,
						},
					},
					default: "import",
				},
				{
					width: 400,
				}
			).render(true)
		}, 200)
	}

	static import(file: { text: string; name: string; path: string }) {
		const importer = new ItemImporter()
		importer._import(file)
	}

	async _import(file: { text: string; name: string; path: string }) {
		const json = file.text
		// Return;
		const name = file.name.split(".")[0]
		// Const name = "Library Test";
		let r: ItemLibraryData | any
		const errorMessages: string[] = []
		try {
			r = JSON.parse(json)
		} catch (err) {
			console.error(err)
			errorMessages.push(LocalizeGURPS.translations.gurps.error.import.no_json_detected)
			return this.throwImportError(errorMessages)
		}

		// Let commit: ItemLibraryData | any = {};
		try {
			if (r.version < this.version)
				return this.throwImportError(
					errorMessages.concat(LocalizeGURPS.translations.gurps.error.import.format_old)
				)
			if (r.version > this.version)
				return this.throwImportError(
					errorMessages.concat(LocalizeGURPS.translations.gurps.error.import.format_new)
				)

			// Commit = { ...commit, ...{ type: r.type } };
			// commit = { ...commit, ...{ version: r.version } };

			const items: Array<ItemSystemDataGURPS> = []
			items.push(...ImportUtils.importItems(r.rows))
			// Commit = { ...commit, ...{ rows: items } };

			let pack = game.packs.find(p => p.metadata.name === name)
			if (!pack) {
				pack = await CompendiumCollection.createCompendium({
					type: "Item",
					label: name,
					name: name,
					package: "world",
					path: "",
					private: true,
				})
			}
			ui.notifications?.info(
				LocalizeGURPS.format(LocalizeGURPS.translations.gurps.system.library_import.start, { name: name })
			)
			let counter = items.length
			Item.create(items as any, { pack: `world.${name}` })
			ui.notifications?.info(
				LocalizeGURPS.format(LocalizeGURPS.translations.gurps.system.library_import.finished, {
					number: counter,
				})
			)
			const cb = game.CompendiumBrowser
			// Const cb = GURPS.CompendiumBrowser
			if (cb.rendered) cb.render(true)
		} catch (err) {
			console.error(err)
			errorMessages.push(
				LocalizeGURPS.format(LocalizeGURPS.translations.gurps.error.import.generic, {
					name: name,
					message: (err as Error).message,
				})
			)
			return this.throwImportError(errorMessages)
		}
	}

	async throwImportError(msg: string[]) {
		ui.notifications?.error(msg.join("<br>"))

		await ChatMessage.create({
			content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/chat/character-import-error.hbs`, {
				lines: msg,
			}),
			user: game.user!.id,
			type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
			whisper: [game.user!.id],
		})
		return false
	}
}
