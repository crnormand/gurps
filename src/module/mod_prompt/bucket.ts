import { RollModifier, SOCKET, SYSTEM_NAME, UserFlags } from "@module/data"
import { PDF } from "@module/pdf"

class ModifierBucket extends Application {
	categoriesOpen: boolean[] = [false, false, false, false, false, false, false, false, false, false]

	constructor(button: any, options = {}) {
		super(options)
		this.value = ""
		this.button = button
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			template: `systems/${SYSTEM_NAME}/templates/modifier-bucket/window.hbs`,
			popOut: false,
			minimizable: false,
			width: 850,
			scrollY: ["#categories .content"],
		})
	}

	async render(force?: boolean | undefined, options?: Application.RenderOptions<ApplicationOptions> | undefined) {
		this.button.showing = true
		await super.render(force, options)
	}

	close(options?: Application.CloseOptions | undefined): Promise<void> {
		this.button.showing = false
		game.ModifierList.fadeOut()
		return super.close(options)
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object | Promise<object> {
		const user = game.user
		let modStack = user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) ?? []

		const commonMods = CONFIG.GURPS.commonMods

		commonMods.forEach((e: any, i: number) => {
			e.open = this.categoriesOpen[i]
		})

		const genericMods = [-5, -4, -3, -2, -1, +1, +2, +3, +4, +5].map(e => {
			return { modifier: e }
		})

		const players = game.users ?? []

		// Const commonMods: any[] = []
		return mergeObject(super.getData(options), {
			value: this.value,
			players: players,
			meleeMods: CONFIG.GURPS.meleeMods,
			rangedMods: CONFIG.GURPS.rangedMods,
			defenseMods: CONFIG.GURPS.defenseMods,
			currentMods: modStack,
			commonMods: commonMods,
			genericMods: genericMods,
		})
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)

		// Get position
		const button = $("#modifier-app")
		// Const buttonTop = button.offset()?.top ?? 0; // might use position() depending on as yet unencountered issues
		// const buttonLeft = button.offset()?.left ?? 0;
		const buttonTop = button.position()?.top ?? 0
		const buttonLeft = (button.position()?.left || 0) + 220 ?? 0
		let buttonWidth = parseFloat(button.css("width").replace("px", ""))
		// Let width = parseFloat(html.find(".searchbar").css("width").replace("px", ""));
		// const width = 900
		const width = html.width() || 640
		let height = parseFloat(html.css("height").replace("px", ""))

		let left = Math.max(buttonLeft + buttonWidth / 2 - width / 2, 10)
		html.css("left", `${left}px`)
		html.css("top", `${buttonTop - height - 10}px`)

		// Focus the textbox on show
		const searchbar = html.find(".searchbar")
		searchbar.trigger("focus")

		// Detect changes to input
		searchbar.on("keydown", event => this._keyDown(event))

		// Modifier Deleting
		// html.find(".active").on("click", event => this.removeModifier(event))
		html.find(".player").on("click", event => this.sendToPlayer(event))
		html.find(".modifier").on("click", event => this._onClickModifier(event))
		html.find(".collapsible").on("click", event => this._onCollapseToggle(event))
		html.find(".ref").on("click", event => PDF.handle(event))
	}

	protected async _onCollapseToggle(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()
		const index = parseInt($(event.currentTarget).find(".dropdown-toggle").data("index"))
		this.categoriesOpen[index] = !this.categoriesOpen[index]
		return this.render()
	}

	_keyDown(event: JQuery.KeyDownEvent) {
		const value = ($(event.currentTarget).val() as string) ?? ""
		const customMod: RollModifier = { name: "", modifier: 0, tags: [] }
		const modifierMatch = value.match(/^[-+]?[0-9]+\s*/)
		if (modifierMatch) {
			customMod.modifier = parseInt(modifierMatch[0]) ?? 0
			customMod.name = value.replace(modifierMatch[0], "")
		} else {
			customMod.modifier = 0
			customMod.name = value
		}
		if (["Enter", "Escape"].includes(event.key)) {
			event.preventDefault()
			switch (event.key) {
				case "Enter":
					this.addModifier(customMod)
				case "Escape":
					return this.close()
			}
		}
	}

	_onClickModifier(event: JQuery.ClickEvent) {
		event.preventDefault()
		const modifier = $(event.currentTarget).data("modifier")
		return this.addModifier(modifier)
	}

	removeModifier(event: JQuery.ClickEvent) {
		event.preventDefault()
		const modList: RollModifier[] =
			(game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
		const index = $(event.currentTarget).data("index")
		modList.splice(index, 1)
		game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList)
		this.render()
		this.button.render()
		game.ModifierList.render()
	}

	togglePin(customMod: RollModifier) {
		const pinnedMods: RollModifier[] =
			(game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierPinned) as RollModifier[]) ?? []
		const matchingMod = pinnedMods.find(e => e.name === customMod.name)
		if (matchingMod) {
			pinnedMods.splice(pinnedMods.indexOf(matchingMod), 1)
		} else {
			pinnedMods.push(customMod)
		}
		game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierPinned, pinnedMods)
		this.render()
	}

	addModifier(mod: RollModifier) {
		this.value = ""
		game.ModifierList.addModifier(mod)
		game.ModifierList.render()
	}

	async sendToPlayer(event: JQuery.ClickEvent) {
		event.preventDefault()
		const id = $(event.currentTarget).data("user-id")
		const player = game.users?.get(id)
		if (!player) return
		const modStack = game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack)
		await player.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modStack)
		game.socket?.emit(`system.${SYSTEM_NAME}`, { type: SOCKET.UPDATE_BUCKET, users: [player.id] })
	}
}

interface ModifierBucket extends Application {
	button: any
	value: string
}

export { ModifierBucket }
