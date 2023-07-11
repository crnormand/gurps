import { ActorConstructorContextGURPS, BaseActorGURPS } from "@actor/base"
import { DocumentModificationOptionsGURPS } from "@actor/character"
import { CharacterImporter } from "@actor/character/import"
import { EquipmentContainerGURPS, EquipmentGURPS, ItemGCS, ModifierChoiceSheet } from "@item"
import { ItemType, SETTINGS, SYSTEM_NAME } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { LocalizeGURPS, round, Weight, WeightUnits } from "@util"
import Document, { Metadata } from "types/foundry/common/abstract/document.mjs"
import { ActorDataConstructorData } from "types/foundry/common/data/data.mjs/actorData"
import { LootSource, LootSystemData } from "./data"

class LootGURPS extends BaseActorGURPS {
	constructor(data: LootSource, context: ActorConstructorContextGURPS = {}) {
		super(data, context)
	}

	override update(
		data?: DeepPartial<ActorDataConstructorData | (ActorDataConstructorData & Record<string, unknown>)>,
		context?: DocumentModificationContext & foundry.utils.MergeObjectOptions & { noPrepare?: boolean }
	): Promise<this | undefined> {
		// Console.log(data, context)
		if (context?.noPrepare) this.noPrepare = true
		this.checkImport(data)
		return super.update(data, context)
	}

	checkImport(data?: any) {
		for (const i in data) {
			if (i.includes("system.import")) return
			if (i.includes("ownership")) return
		}
		data["system.modified_date"] = new Date().toISOString()
	}

	get weightUnits(): WeightUnits {
		return this.settings.default_weight_units
	}

	get importData(): this["system"]["import"] {
		return this.system.import
	}

	get settings() {
		return this.system.settings
	}

	get created_date(): string {
		return this.system.created_date
	}

	get modified_date(): string {
		return this.system.created_date
	}

	get fastWealthCarried(): string {
		return `$${this.wealthCarried()}`
	}

	get fastWeightCarried(): string {
		return Weight.format(this.weightCarried(false), this.weightUnits)
	}

	weightCarried(for_skills: boolean): number {
		let total = 0
		this.equipment.forEach(e => {
			if (e.parent === this) {
				total += e.extendedWeight(for_skills, this.settings.default_weight_units)
			}
		})
		return round(total, 4)
	}

	wealthCarried(): number {
		let value = 0
		for (const e of this.equipment) {
			if (e.parent === this) value += e.extendedValue
		}
		return round(value, 4)
	}

	get equipment(): Collection<EquipmentGURPS | EquipmentContainerGURPS> {
		const equipment: Collection<EquipmentGURPS | EquipmentContainerGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof EquipmentGURPS || item instanceof EquipmentContainerGURPS) equipment.set(item.id!, item)
		}
		return equipment
	}

	get carried_equipment(): Collection<EquipmentGURPS | EquipmentContainerGURPS> {
		return this.equipment
	}

	protected override _onCreateDescendantDocuments(
		embeddedName: string,
		documents: Document<any, any, Metadata<any>>[],
		result: Record<string, unknown>[],
		options: DocumentModificationOptionsGURPS,
		userId: string
	): void {
		super._onCreateDescendantDocuments(embeddedName, documents, result, options, userId)

		// Replace @X@ notation fields with given text
		if (embeddedName === "Item" && options.substitutions) {
			for (const item of documents.filter(e => e instanceof ItemGCS)) {
				// If ((item as any).modifiers) ModifierChoiceSheet.new([item as ItemGCS])
				ModifierChoiceSheet.new([item as ItemGCS])
				// ItemSubstitutionSheet.new([item as ItemGCS])
			}
		}
	}

	override prepareEmbeddedDocuments(): void {
		super.prepareEmbeddedDocuments()
		this.processPrereqs()
	}

	processPrereqs(): void {
		const not_met = LocalizeGURPS.translations.gurps.prereqs.not_met
		for (const e of this.equipment) {
			e.unsatisfied_reason = ""
			if (!e.prereqsEmpty) {
				const tooltip = new TooltipGURPS()
				if (!e.prereqs.satisfied(this, e, tooltip)[0]) {
					e.unsatisfied_reason = not_met + tooltip.toString()
				}
			}
		}
	}

	async saveLocal(): Promise<void> {
		const json = await this.exportSystemData()
		return saveDataToFile(json.text, "gcs", json.name)
	}

	protected async exportSystemData() {
		const system: any = duplicate(this.system)
		system.type = "character"
		const items = this.items.map((e: any) => e.exportSystemData(true))
		const third_party: any = {}

		third_party.settings = { resource_trackers: system.settings.resource_trackers }
		third_party.resource_trackers = system.resource_trackers
		third_party.import = system.import
		third_party.move = system.move
		system.third_party = third_party
		system.equipment =
			items
				.filter(
					e => [ItemType.Equipment, "equipment", ItemType.EquipmentContainer].includes(e.type) && !e.other
				)
				.map(e => {
					delete e.other
					return e
				}) ?? []
		const json = JSON.stringify(system, null, "\t")
		const filename = `${this.name}.gcs`

		return { text: json, name: filename }
	}

	async promptImport() {
		let dialog = new Dialog({
			title: LocalizeGURPS.translations.gurps.character.import_prompt.title,
			content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/actor/import-prompt.hbs`, { object: this }),
			buttons: {
				import: {
					icon: '<i class="fas fa-file-import"></i>',
					label: LocalizeGURPS.translations.gurps.character.import_prompt.import,
					callback: _html => {
						let file: any = null
						if (game.settings.get(SYSTEM_NAME, SETTINGS.SERVER_SIDE_FILE_DIALOG)) {
							const filepicker = new FilePicker({
								callback: (path: string) => {
									const request = new XMLHttpRequest()
									request.open("GET", path)
									new Promise(resolve => {
										request.onload = () => {
											if (request.status === 200) {
												const text = request.response
												file = {
													text: text,
													name: path,
													path: request.responseURL,
												}
												CharacterImporter.import(this, file)
											}
											resolve(this)
										}
									})
									request.send(null)
								},
							})
							filepicker.extensions = [".gcs", ".xml", ".gca5"]
							filepicker.render(true)
						} else {
							const inputEl = document.createElement("input")
							inputEl.type = "file"
							$(inputEl).on("change", event => {
								const rawFile = $(event.currentTarget).prop("files")[0]
								file = {
									text: "",
									name: rawFile.name,
									path: rawFile.path,
								}
								readTextFromFile(rawFile).then(text => {
									CharacterImporter.import(this, {
										text: text,
										name: rawFile.name,
										path: rawFile.path,
									})
								})
							})
							$(inputEl).trigger("click")
						}
					},
				},
			},
		})
		dialog.render(true)
	}
}

interface LootGURPS extends BaseActorGURPS {
	system: LootSystemData
	_source: LootSource
}

export { LootGURPS }
