import { RollModifier, SYSTEM_NAME } from "@module/data"
import { i18n, prepareFormData } from "@util"
import { SettingsMenuGURPS } from "./menu"

export class RollModifierSettings extends SettingsMenuGURPS {
	static override readonly namespace = "roll_modifiers"

	static override readonly SETTINGS = ["modifiers"]

	static override get defaultOptions(): FormApplicationOptions {
		const options = super.defaultOptions
		options.classes.push("gurps")
		options.classes.push("settings-menu")

		return mergeObject(options, {
			title: `gurps.settings.${this.namespace}.name`,
			id: `${this.namespace}-settings`,
			template: `systems/${SYSTEM_NAME}/templates/system/settings/${this.namespace}.hbs`,
			width: 480,
			height: "auto",
			submitOnClose: true,
			submitOnChange: true,
			closeOnSubmit: false,
			resizable: true,
		} as FormApplicationOptions)
	}

	protected static override get settings(): Record<string, any> {
		return {
			modifiers: {
				name: "",
				hint: "",
				type: Array,
				default: [],
			},
		}
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		// Html.find(".reset-all").on("click", event => this._onResetAll(event))
		html.find(".item").on("dragover", event => this._onDragItem(event))
		html.find(".add").on("click", event => this._onAddItem(event))
		html.find(".delete").on("click", event => this._onDeleteItem(event))
	}

	async _onAddItem(event: JQuery.ClickEvent) {
		event.preventDefault()
		event.stopPropagation()
		const modifiers: RollModifier[] = (game as Game).settings.get(
			SYSTEM_NAME,
			`${this.namespace}.modifiers`
		) as RollModifier[]
		modifiers.push({
			name: i18n("gurps.setting.roll_modifiers.default"),
			modifier: 0,
		})
		await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.modifiers`, modifiers)
		return this.render()
	}

	private async _onDeleteItem(event: JQuery.ClickEvent) {
		event.preventDefault()
		event.stopPropagation()
		const modifiers: RollModifier[] = (game as Game).settings.get(
			SYSTEM_NAME,
			`${this.namespace}.modifiers`
		) as RollModifier[]
		const index = Number($(event.currentTarget).data("index")) || 0
		modifiers.splice(index, 1)
		await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.modifiers`, modifiers)
		return this.render()
	}

	async _onDragStart(event: DragEvent) {
		// TODO:update
		const item = $(event.currentTarget!)
		const index = Number(item.data("index"))
		event.dataTransfer?.setData(
			"text/plain",
			JSON.stringify({
				index: index,
			})
		)
	}

	protected _onDragItem(event: JQuery.DragOverEvent): void {
		const element = $(event.currentTarget!)
		const heightAcross = (event.pageY! - element.offset()!.top) / element.height()!
		element.siblings(".item").removeClass("border-top").removeClass("border-bottom")
		if (heightAcross > 0.5) {
			element.removeClass("border-top")
			element.addClass("border-bottom")
		} else {
			element.removeClass("border-bottom")
			element.addClass("border-top")
		}
	}

	protected async _onDrop(event: DragEvent): Promise<unknown> {
		let dragData = JSON.parse(event.dataTransfer!.getData("text/plain"))
		let element = $(event.target!)
		if (!element.hasClass("item")) element = element.parent(".item")

		const modifiers: RollModifier[] = (game as Game).settings.get(
			SYSTEM_NAME,
			`${this.namespace}.modifiers`
		) as RollModifier[]
		const target_index = element.data("index")
		const above = element.hasClass("border-top")
		if (dragData.order === target_index) return this.render()
		if (above && dragData.order === target_index - 1) return this.render()
		if (!above && dragData.order === target_index + 1) return this.render()

		let item
		item = modifiers.splice(dragData.index, 1)[0]
		modifiers.splice(target_index, 0, item)
		await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.modifiers`, modifiers)
		return this.render()
	}

	override async getData(): Promise<any> {
		const modifiers: RollModifier[] = (game as Game).settings.get(
			SYSTEM_NAME,
			`${this.namespace}.modifiers`
		) as RollModifier[]
		return {
			modifiers: modifiers,
			config: (CONFIG as any).GURPS,
		}
	}

	protected override async _updateObject(_event: Event, formData: any): Promise<void> {
		const modifiers: RollModifier[] = (game as Game).settings.get(
			SYSTEM_NAME,
			`${this.namespace}.modifiers`
		) as RollModifier[]
		formData = prepareFormData(_event, formData, { modifiers: modifiers })
		await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.modifiers`, formData.modifiers)
	}
}
