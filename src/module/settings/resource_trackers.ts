import { SYSTEM_NAME } from "@module/data"
import { prepareFormData } from "@util"
import { DnD } from "@util/drag_drop"
import { SettingsMenuGURPS } from "./menu"

export class DefaultResourceTrackerSettings extends SettingsMenuGURPS {
	static override readonly namespace = "default_resource_trackers"

	static override readonly SETTINGS = ["resource_trackers"]

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
			resource_trackers: {
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
		const resource_trackers: any[] = (game as Game).settings.get(
			SYSTEM_NAME,
			`${this.namespace}.resource_trackers`
		) as any[]
		const type: "resource_trackers" | "tracker_thresholds" = $(event.currentTarget).data("type")
		let new_id = ""
		if (type === "resource_trackers")
			for (let n = 0; n < 26; n++) {
				const char = String.fromCharCode(97 + n)
				if (![...resource_trackers].find(e => e.id === char)) {
					new_id = char
					break
				}
			}
		switch (type) {
			case "resource_trackers":
				// TODO: account for possibility of all letters being taken
				resource_trackers.push({
					id: new_id,
					name: "",
					full_name: "",
					max: 10,
					min: 0,
					isMaxEnforced: false,
					isMinEnforced: false,
					thresholds: [],
				})
				await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.resource_trackers`, resource_trackers)
				return this.render()
			case "tracker_thresholds":
				resource_trackers[$(event.currentTarget).data("id")].thresholds ??= []
				resource_trackers[$(event.currentTarget).data("id")].thresholds!.push({
					state: "",
					explanation: "",
					expression: "",
					ops: [],
				})
				await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.resource_trackers`, resource_trackers)
				return this.render()
		}
	}

	private async _onDeleteItem(event: JQuery.ClickEvent) {
		event.preventDefault()
		event.stopPropagation()
		const resource_trackers: any[] = (game as Game).settings.get(
			SYSTEM_NAME,
			`${this.namespace}.resource_trackers`
		) as any[]
		const type: "resource_trackers" | "tracker_thresholds" = $(event.currentTarget).data("type")
		const index = Number($(event.currentTarget).data("index")) || 0
		const parent_index = Number($(event.currentTarget).data("pindex")) || 0
		switch (type) {
			case "resource_trackers":
				resource_trackers.splice(index, 1)
				await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.resource_trackers`, resource_trackers)
				return this.render()
			case "tracker_thresholds":
				resource_trackers[parent_index].thresholds?.splice(index, 1)
				await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.resource_trackers`, resource_trackers)
				return this.render()
		}
	}

	async _onDragStart(event: DragEvent) {
		// TODO:update
		const item = $(event.currentTarget!)
		const type: "resource_trackers" | "tracker_thresholds" = item.data("type")
		const index = Number(item.data("index"))
		const parent_index = Number(item.data("pindex")) || 0
		event.dataTransfer?.setData(
			"text/plain",
			JSON.stringify({
				type: type,
				index: index,
				parent_index: parent_index,
			})
		)
		;(event as any).dragType = type
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
		let dragData = DnD.getDragData(event, DnD.TEXT_PLAIN)
		let element = $(event.target!)
		if (!element.hasClass("item")) element = element.parent(".item")

		const resource_trackers = (game as Game).settings.get(
			SYSTEM_NAME,
			`${this.namespace}.resource_trackers`
		) as any[]
		const target_index = element.data("index")
		const above = element.hasClass("border-top")
		if (dragData.order === target_index) return this.render()
		if (above && dragData.order === target_index - 1) return this.render()
		if (!above && dragData.order === target_index + 1) return this.render()

		let container: any[] = []
		if (dragData.type === "resource_trackers") container = resource_trackers
		else if (dragData.type === "tracker_thresholds") container = resource_trackers
		if (!container) return

		let item
		if (dragData.type.includes("_thresholds")) {
			item = container[dragData.parent_index].thresholds.splice(dragData.index, 1)[0]
			container[dragData.parent_index].thresholds.splice(target_index, 0, item as any)
		} else {
			item = container.splice(dragData.index, 1)[0]
			container.splice(target_index, 0, item as any)
		}
		container.forEach((v: any, k: number) => {
			v.order = k
		})

		await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.resource_trackers`, resource_trackers)
		return this.render()
	}

	override async getData(): Promise<any> {
		const resource_trackers = (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.resource_trackers`)
		return {
			resourceTrackers: resource_trackers,
			actor: null,
			config: (CONFIG as any).GURPS,
		}
	}

	protected override async _updateObject(_event: Event, formData: any): Promise<void> {
		const resource_trackers = await (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.resource_trackers`)
		formData = prepareFormData(_event, formData, { system: { settings: { resource_trackers } } })
		await (game as Game).settings.set(
			SYSTEM_NAME,
			`${this.namespace}.resource_trackers`,
			formData["system.settings.resource_trackers"]
		)
	}
}
