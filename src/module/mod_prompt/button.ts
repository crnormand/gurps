import { RollModifier, RollType, SETTINGS, SYSTEM_NAME, UserFlags } from "@module/data"
import { i18n, RollGURPS } from "@util"
import { handleRoll } from "@util/roll"
import { ModifierBucket } from "./bucket"
import { ModifierWindow } from "./window"

export class ModifierButton extends Application {
	_tempRangeMod: RollModifier = { name: "", modifier: 0 }

	constructor(options = {}) {
		super(options)
		this.showing = false
		const modifierMode = ((game as Game).settings.get(SYSTEM_NAME, SETTINGS.MODIFIER_MODE) as string) || "prompt"
		if (modifierMode === "prompt") {
			this.window = new ModifierWindow(this, {})
		} else {
			this.window = new ModifierBucket(this, {})
		}
	}

	async render(
		force?: boolean | undefined,
		options?: Application.RenderOptions<ApplicationOptions> | undefined
	): Promise<unknown> {
		await this.recalculateModTotal((game as Game).user)
		if (this.window.rendered) await this.window.render()
		return super.render(force, options)
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			popOut: false,
			minimizable: false,
			resizable: false,
			id: "ModifierButton",
			template: `systems/${SYSTEM_NAME}/templates/modifier-app/button.hbs`,
			classes: ["modifier-button"],
		})
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object {
		const user = (game as Game).user
		let total = user?.getFlag(SYSTEM_NAME, UserFlags.ModifierTotal) ?? 0
		let buttonMagnet = ""
		if (user?.getFlag(SYSTEM_NAME, UserFlags.ModifierSticky) === true) buttonMagnet = "sticky"
		let buttonColor = "total-white"
		if (total > 0) buttonColor = "total-green"
		if (total < 0) buttonColor = "total-red"
		const showDice = true

		return mergeObject(super.getData(options), {
			total: total,
			buttonColor: buttonColor,
			buttonMagnet: buttonMagnet,
			imgDice: `systems/${SYSTEM_NAME}/assets/3d6.webp`,
			showDice,
		})
	}

	setRangeMod(mod: RollModifier) {
		this._tempRangeMod = mod
	}

	addRangeMod() {
		;(game as any).ModifierButton.window.addModifier(this._tempRangeMod)
	}

	protected _injectHTML(html: JQuery<HTMLElement>): void {
		if ($("body").find("#modifier-app").length === 0) {
			html.insertAfter($("body").find("#hotbar"))
			this._element = html
		} else {
			throw new Error(i18n("gurps.error.modifier_app_load_failed"))
		}
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find("#modifier-app").on("click", event => this._onClick(event))
		html.on("wheel", event => this._onMouseWheel(event))
		html.find(".magnet").on("click", event => this._onMagnetClick(event))
		html.find(".trash").on("click", event => this.resetMods(event))

		html.find("#dice-roller").on("click", event => this._onDiceClick(event))
		html.find("#dice-roller").on("contextmenu", event => this._onDiceContextMenu(event))
	}

	async _onClick(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()
		if (this.showing) {
			this.window.close()
		} else {
			await this.window.render(true)
		}
	}

	async _onDiceClick(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()
		return handleRoll((game as Game).user, null, { type: RollType.Generic, formula: "3d6" })
	}

	async _onDiceContextMenu(event: JQuery.ContextMenuEvent): Promise<void> {
		event.preventDefault()
		return handleRoll((game as Game).user, null, { type: RollType.Generic, formula: "1d6" })
	}

	async _onMagnetClick(event: JQuery.ClickEvent): Promise<unknown> {
		event.preventDefault()
		event.stopPropagation()
		const sticky = (game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierSticky) ?? false
		await (game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierSticky, !sticky)
		return this.render()
	}

	async resetMods(event: JQuery.ClickEvent): Promise<unknown> {
		event.preventDefault()
		event.stopPropagation()
		await (game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, [])
		return this.render()
	}

	async _onMouseWheel(event: JQuery.TriggeredEvent) {
		const originalEvent = event.originalEvent
		if (originalEvent instanceof WheelEvent) {
			const delta = Math.round(originalEvent.deltaY / -100)
			return this.window.addModifier({
				name: "",
				modifier: delta,
				tags: [],
			})
		}
	}

	async recalculateModTotal(user: StoredDocument<User> | null): Promise<unknown> {
		if (!user) return
		let total = 0
		const mods: RollModifier[] = (user.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
		if (mods.length > 0)
			for (const m of mods) {
				total += m.modifier
			}
		await user.setFlag(SYSTEM_NAME, UserFlags.ModifierTotal, total)
	}
}

export interface ModifierButton extends Application {
	showing: boolean
	window: ModifierWindow | ModifierBucket
}
