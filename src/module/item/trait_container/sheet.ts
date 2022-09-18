import { ItemGURPS } from "@item";
import { ContainerSheetGURPS } from "@item/container/sheet";

export class TraitContainerSheet extends ContainerSheetGURPS {
	static get defaultOptions(): DocumentSheetOptions {
		const options = super.defaultOptions;
		mergeObject(options, {
			classes: options.classes.concat(["trait_container"]),
		});
		return options;
	}

	getData(options?: Partial<DocumentSheetOptions> | undefined) {
		const items = this.items;
		const sheetData = {
			...super.getData(options),
			...{
				modifiers: items.filter(e => e.type.includes("modifier")),
			},
		};
		return sheetData;
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html);
		html.find(".item").on("dblclick", event => this._openItemSheet(event));
	}

	protected async _openItemSheet(event: JQuery.DoubleClickEvent) {
		event.preventDefault();
		const uuid = $(event.currentTarget).data("uuid");
		const item = (await fromUuid(uuid)) as ItemGURPS;
		item?.sheet?.render(true);
	}

	protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<unknown> {
		if (Object.keys(formData).includes("system.disabled"))
			formData["system.disabled"] = !formData["system.disabled"];
		return super._updateObject(event, formData);
	}
}
