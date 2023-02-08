import { SYSTEM_NAME } from "@module/data"
import { openPDF } from "@module/pdf"
import { BaseItemGURPS } from "."

export class ItemSheetGURPS extends ItemSheet {
	static override get defaultOptions(): DocumentSheetOptions<Item> {
		const options = super.defaultOptions
		mergeObject(options, {
			width: 620,
			min_width: 620,
			height: 800,
			classes: options.classes.concat(["item", "gurps"]),
		})
		return options
	}

	override get template(): string {
		return `/systems/${SYSTEM_NAME}/templates/item/${this.item.type}/sheet.hbs`
	}

	override activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find(".ref").on("click", event => this._handlePDF(event))
	}

	protected async _handlePDF(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()
		const pdf = $(event.currentTarget).data("pdf")
		if (pdf) return openPDF(pdf)
	}

	get item(): this["object"] {
		return this.object
	}
}

export interface ItemSheetGURPS extends ItemSheet {
	object: BaseItemGURPS
}
