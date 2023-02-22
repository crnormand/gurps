import { RollModifier, SOCKET, SYSTEM_NAME, UserFlags } from "@module/data"
import { openPDF } from "@module/pdf"

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
		html.find(".ref").on("click", event => this._handlePDF(event))
	}

	protected async _onCollapseToggle(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()
		const index = parseInt($(event.currentTarget).find(".dropdown-toggle").data("index"))
		this.categoriesOpen[index] = !this.categoriesOpen[index]
		return this.render()
	}

	protected async _handlePDF(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()
		const pdf = $(event.currentTarget).data("pdf")
		if (pdf) return openPDF(pdf)
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
					return this.addModifier(customMod)
				case "Escape":
					return this.close()
			}
		}
	}

	_onClickModifier(event: JQuery.ClickEvent) {
		event.preventDefault()
		const modifier: RollModifier = {
			name: $(event.currentTarget).data("name"),
			modifier: $(event.currentTarget).data("modifier"),
		}
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
		game.ModifierList.render(true)
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
		const modList: RollModifier[] =
			(game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
		const oldMod = modList.find(e => e.name === mod.name)
		if (oldMod) oldMod.modifier += mod.modifier
		else modList.push(mod)
		game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList)
		this.value = ""
		this.render()
		this.button.render()
		game.ModifierList.render(true)
	}

	async sendToPlayer(event: JQuery.ClickEvent) {
		event.preventDefault()
		const uuid = $(event.currentTarget).data("uuid")
		const player = (await fromUuid(uuid)) as User
		// Const player = game.users?.get(uuid)
		console.log(player)
		if (!player) return
		const modStack = game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack)
		await player.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modStack)
		console.log(player, player.id)
		game.socket?.emit("system.gcsga", { type: SOCKET.UPDATE_BUCKET, users: [player.id] })
	}
}

interface ModifierBucket extends Application {
	button: any
	value: string
}

export { ModifierBucket }
