import { ItemGURPS } from "@item"
import { ContainerSheetGURPS } from "@item/container/sheet"
import { SYSTEM_NAME } from "@module/data"

export class EquipmentSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions
		mergeObject(options, {
			classes: options.classes.concat(["equipment"]),
		})
		return options
	}

	get template(): string {
		return `/systems/${SYSTEM_NAME}/templates/item/equipment/sheet.hbs`
	}

	getData(options?: Partial<DocumentSheetOptions> | undefined) {
		const items = this.items
		const sheetData = {
			...super.getData(options),
			...{
				modifiers: items.filter(e => e.type.includes("modifier")),
			},
		}
		return sheetData
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find(".item").on("dblclick", event => this._openItemSheet(event))
	}

	protected async _openItemSheet(event: JQuery.DoubleClickEvent) {
		event.preventDefault()
		const uuid = $(event.currentTarget).data("uuid")
		const item = (await fromUuid(uuid)) as ItemGURPS
		item?.sheet?.render(true)
	}
}
