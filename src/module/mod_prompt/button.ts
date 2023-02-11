import { RollModifier, RollType, SETTINGS, SYSTEM_NAME, UserFlags } from "@module/data"
import { RollGURPS } from "@module/roll"
import { ModifierBucket } from "./bucket"
import { ModifierWindow } from "./window"

class ModifierButton extends Application {
	_tempRangeMod: RollModifier = { name: "", modifier: 0 }

	modifierMode: "prompt" | "bucket" = "prompt"

	private _window?: ModifierWindow | ModifierBucket

	constructor(options = {}) {
		super(options)
		this.showing = false
		this.modifierMode = game.settings.get(SYSTEM_NAME, SETTINGS.MODIFIER_MODE) as "prompt" | "bucket"
	}

	async render(
		force?: boolean | undefined,
		options?: Application.RenderOptions<ApplicationOptions> | undefined
	): Promise<unknown> {
		await this.recalculateModTotal(game.user)
		this.modifierMode = game.settings.get(SYSTEM_NAME, SETTINGS.MODIFIER_MODE) as "prompt" | "bucket"
		if (this.window?.rendered) await this.window.render()
		return super.render(force, options)
	}

	get window(): ModifierWindow | ModifierBucket {
		this.modifierMode = game.settings.get(SYSTEM_NAME, SETTINGS.MODIFIER_MODE) as "prompt" | "bucket"
		if (this._window) {
			if (this._window instanceof ModifierWindow && this.modifierMode === "bucket")
				this._window = new ModifierBucket(this, {})
			else if (this._window instanceof ModifierBucket && this.modifierMode === "prompt")
				this._window = new ModifierWindow(this, {})
			return this._window
		}
		if (this.modifierMode === "bucket") this._window = new ModifierBucket(this, {})
		else this._window = new ModifierWindow(this, {})
		return this._window
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
		const user = game.user
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
			throw new Error("gurps.error.modifier_app_load_failed")
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
		return RollGURPS.handleRoll(game.user, null, {
			type: RollType.Generic,
			formula: "3d6",
			hidden: event.ctrlKey,
		})
	}

	async _onDiceContextMenu(event: JQuery.ContextMenuEvent): Promise<void> {
		event.preventDefault()
		console.log(event.ctrlKey)
		return RollGURPS.handleRoll(game.user, null, {
			type: RollType.Generic,
			formula: "1d6",
			hidden: event.ctrlKey,
		})
	}

	async _onMagnetClick(event: JQuery.ClickEvent): Promise<unknown> {
		event.preventDefault()
		event.stopPropagation()
		const sticky = game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierSticky) ?? false
		await game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierSticky, !sticky)
		return this.render()
	}

	async clear() {
		await game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, [])
		await game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierTotal, 0)
		return this.render(true)
	}

	async resetMods(event: JQuery.ClickEvent): Promise<unknown> {
		event.preventDefault()
		event.stopPropagation()
		return this.clear()
	}

	async _onMouseWheel(event: JQuery.TriggeredEvent) {
		const originalEvent = event.originalEvent
		if (originalEvent instanceof WheelEvent) {
			const delta = Math.round(originalEvent.deltaY / -100)
			return this.addModifier({
				name: "",
				modifier: delta,
				tags: [],
			})
		}
	}

	addModifier(mod: RollModifier) {
		const modList: RollModifier[] =
			(game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
		const oldMod = modList.find(e => e.name === mod.name)
		if (oldMod) oldMod.modifier += mod.modifier
		else modList.push(mod)
		game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList)
		// This.list.customMod = null
		// this.list.mods = []
		// this.list.selection = -1
		// this.value = ""
		this.render()
		Hooks.call("addModifier")
		// This.button.render()
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

	// Async showText() {
	// 	const args = [
	// 		{
	// 			x: 1890,
	// 			y: 1100
	// 		},
	// 		"checkem",
	// 		{
	// 			anchor: 2,
	// 			direction: 2,
	// 			fill: "#FFFFFF",
	// 			fontSize: 24,
	// 			jitter: 0.25,
	// 			stroke: "#111111",
	// 			strokeThickness: 1,
	// 			textStyle: {
	// 				"z-index": 2
	// 			}
	// 		}
	// 	]
	// 	console.log(args)
	// 	await (canvas as any).interface.createScrollingText(...args)
	// }
}

interface ModifierButton extends Application {
	showing: boolean
	window: ModifierWindow | ModifierBucket
}

export { ModifierButton }
