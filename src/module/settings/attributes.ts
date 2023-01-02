import { AttributeType } from "@module/attribute/attribute_def"
import { SYSTEM_NAME } from "@module/data"
import { prepareFormData } from "@util"
import { DnD } from "@util/drag_drop"
import { SettingsMenuGURPS } from "./menu"

export class DefaultAttributeSettings extends SettingsMenuGURPS {
	static override readonly namespace = "default_attributes"

	static override readonly SETTINGS = ["attributes"] as const

	static override get defaultOptions(): FormApplicationOptions {
		const options = super.defaultOptions
		options.classes.push("gurps")
		options.classes.push("settings-menu")

		return mergeObject(options, {
			title: `gurps.settings.${this.namespace}.name`,
			id: `${this.namespace}-settings`,
			template: `systems/${SYSTEM_NAME}/templates/system/settings/${this.namespace}.hbs`,
			width: 480,
			height: 600,
			submitOnClose: true,
			submitOnChange: true,
			closeOnSubmit: false,
			resizable: true,
		} as FormApplicationOptions)
	}

	protected static override get settings(): Record<string, any> {
		return {
			attributes: {
				name: "",
				hint: "",
				type: Array,
				default: [
					{
						id: "st",
						type: AttributeType.Integer,
						name: "ST",
						full_name: "Strength",
						attribute_base: "10",
						cost_per_point: 10,
						cost_adj_percent_per_sm: 10,
					},
					{
						id: "dx",
						type: AttributeType.Integer,
						name: "DX",
						full_name: "Dexterity",
						attribute_base: "10",
						cost_per_point: 20,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "iq",
						type: AttributeType.Integer,
						name: "IQ",
						full_name: "Intelligence",
						attribute_base: "10",
						cost_per_point: 20,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "ht",
						type: AttributeType.Integer,
						name: "HT",
						full_name: "Health",
						attribute_base: "10",
						cost_per_point: 10,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "will",
						type: AttributeType.Integer,
						name: "Will",
						attribute_base: "$iq",
						cost_per_point: 5,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "fright_check",
						type: AttributeType.Integer,
						name: "Fright Check",
						attribute_base: "$will",
						cost_per_point: 2,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "per",
						type: AttributeType.Integer,
						name: "Per",
						full_name: "Perception",
						attribute_base: "$iq",
						cost_per_point: 5,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "vision",
						type: AttributeType.Integer,
						name: "Vision",
						attribute_base: "$per",
						cost_per_point: 2,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "hearing",
						type: AttributeType.Integer,
						name: "Hearing",
						attribute_base: "$per",
						cost_per_point: 2,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "taste_smell",
						type: AttributeType.Integer,
						name: "Taste \u0026 Smell",
						attribute_base: "$per",
						cost_per_point: 2,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "touch",
						type: AttributeType.Integer,
						name: "Touch",
						attribute_base: "$per",
						cost_per_point: 2,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "basic_speed",
						type: AttributeType.Decimal,
						name: "Basic Speed",
						attribute_base: "($dx+$ht)/4",
						cost_per_point: 20,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "basic_move",
						type: AttributeType.Integer,
						name: "Basic Move",
						attribute_base: "floor($basic_speed)",
						cost_per_point: 5,
						cost_adj_percent_per_sm: 0,
					},
					{
						id: "fp",
						type: AttributeType.Pool,
						name: "FP",
						full_name: "Fatigue Points",
						attribute_base: "$ht",
						cost_per_point: 3,
						cost_adj_percent_per_sm: 0,
						thresholds: [
							{
								state: "Unconscious",
								expression: "-$fp",
								ops: ["halve_move", "halve_dodge", "halve_st"],
							},
							{
								state: "Collapse",
								explanation:
									"Roll vs. Will to do anything besides talk or rest; failure causes unconsciousness\nEach FP you lose below 0 also causes 1 HP of injury\nMove, Dodge and ST are halved (B426)",
								expression: "0",
								ops: ["halve_move", "halve_dodge", "halve_st"],
							},
							{
								state: "Tired",
								explanation: "Move, Dodge and ST are halved (B426)",
								expression: "round($fp/3)",
								ops: ["halve_move", "halve_dodge", "halve_st"],
							},
							{
								state: "Tiring",
								expression: "$fp-1",
							},
							{
								state: "Rested",
								expression: "$fp",
							},
						],
					},
					{
						id: "hp",
						type: AttributeType.Pool,
						name: "HP",
						full_name: "Hit Points",
						attribute_base: "$st",
						cost_per_point: 2,
						cost_adj_percent_per_sm: 10,
						thresholds: [
							{
								state: "Dead",
								expression: "round(-$hp*5)",
								ops: ["halve_move", "halve_dodge"],
							},
							{
								state: "Dying #4",
								explanation:
									"Roll vs. HT to avoid death\nRoll vs. HT-4 every second to avoid falling unconscious\nMove and Dodge are halved (B419)",
								expression: "round(-$hp*4)",
								ops: ["halve_move", "halve_dodge"],
							},
							{
								state: "Dying #3",
								explanation:
									"Roll vs. HT to avoid death\nRoll vs. HT-3 every second to avoid falling unconscious\nMove and Dodge are halved (B419)",
								expression: "round(-$hp*3)",
								ops: ["halve_move", "halve_dodge"],
							},
							{
								state: "Dying #2",
								explanation:
									"Roll vs. HT to avoid death\nRoll vs. HT-2 every second to avoid falling unconscious\nMove and Dodge are halved (B419)",
								expression: "round(-$hp*2)",
								ops: ["halve_move", "halve_dodge"],
							},
							{
								state: "Dying #1",
								explanation:
									"Roll vs. HT to avoid death\nRoll vs. HT-1 every second to avoid falling unconscious\nMove and Dodge are halved (B419)",
								expression: "-$hp",
								ops: ["halve_move", "halve_dodge"],
							},
							{
								state: "Collapse",
								explanation:
									"Roll vs. HT every second to avoid falling unconscious\nMove and Dodge are halved (B419)",
								expression: "round($hp/3)",
								ops: ["halve_move", "halve_dodge"],
							},
							{
								state: "Reeling",
								explanation: "Move and Dodge are halved (B419)",
								expression: "round($hp/3)",
								ops: ["halve_move", "halve_dodge"],
							},
							{
								state: "Wounded",
								expression: "$hp-1",
							},
							{
								state: "Healthy",
								expression: "$hp",
							},
						],
					},
				],
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
		const attributes: any[] = (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.attributes`) as any[]
		const type: "attributes" | "attribute_thresholds" = $(event.currentTarget).data("type")
		let new_id = ""
		if (type === "attributes")
			for (let n = 0; n < 26; n++) {
				const char = String.fromCharCode(97 + n)
				if (![...attributes].find(e => e.id === char)) {
					new_id = char
					break
				}
			}
		switch (type) {
			case "attributes":
				// TODO: account for possibility of all letters being taken
				attributes.push({
					type: AttributeType.Integer,
					id: new_id,
					name: "",
					attribute_base: "",
					cost_per_point: 0,
					cost_adj_percent_per_sm: 0,
				})
				await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.attributes`, attributes)
				return this.render()
			case "attribute_thresholds":
				attributes[$(event.currentTarget).data("id")].thresholds ??= []
				attributes[$(event.currentTarget).data("id")].thresholds!.push({
					state: "",
					explanation: "",
					expression: "",
					ops: [],
				})
				await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.attributes`, attributes)
				return this.render()
		}
	}

	private async _onDeleteItem(event: JQuery.ClickEvent) {
		event.preventDefault()
		event.stopPropagation()
		const attributes: any[] = (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.attributes`) as any[]
		const type: "attributes" | "attribute_thresholds" = $(event.currentTarget).data("type")
		const index = Number($(event.currentTarget).data("index")) || 0
		const parent_index = Number($(event.currentTarget).data("pindex")) || 0
		switch (type) {
			case "attributes":
				attributes.splice(index, 1)
				await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.attributes`, attributes)
				return this.render()
			case "attribute_thresholds":
				attributes[parent_index].thresholds?.splice(index, 1)
				await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.attributes`, attributes)
				return this.render()
		}
	}

	async _onDragStart(event: DragEvent) {
		// TODO:update
		const item = $(event.currentTarget!)
		const type: "attributes" | "attribute_thresholds" = item.data("type")
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

		const attributes = (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.attributes`) as any[]
		const target_index = element.data("index")
		const above = element.hasClass("border-top")
		if (dragData.order === target_index) return this.render()
		if (above && dragData.order === target_index - 1) return this.render()
		if (!above && dragData.order === target_index + 1) return this.render()

		let container: any[] = []
		if (dragData.type === "attributes") container = attributes
		else if (dragData.type === "attribute_thresholds") container = attributes
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

		await (game as Game).settings.set(SYSTEM_NAME, `${this.namespace}.attributes`, attributes)
		return this.render()
	}

	override async getData(): Promise<any> {
		const attributes = (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.attributes`)
		return {
			attributes: attributes,
			actor: null,
			config: (CONFIG as any).GURPS,
		}
	}

	protected override async _updateObject(_event: Event, formData: any): Promise<void> {
		const attributes = await (game as Game).settings.get(SYSTEM_NAME, `${this.namespace}.attributes`)
		formData = prepareFormData(_event, formData, { system: { settings: { attributes } } })
		await (game as Game).settings.set(
			SYSTEM_NAME,
			`${this.namespace}.attributes`,
			formData["system.settings.attributes"]
		)
	}
}
