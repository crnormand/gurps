import { RollModifier, SYSTEM_NAME, UserFlags } from "@module/data"
import { ModifierButton } from "@module/mod_prompt/button"

class ModifierBucket extends Application {
	constructor(button: ModifierButton, options = {}) {
		super(options)
		this.value = ""
		this.button = button
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			template: `systems/${SYSTEM_NAME}/templates/modifier-bucket/window.hbs`,
			popOut: false,
			minimizable: false,
		})
	}

	async render(force?: boolean | undefined, options?: Application.RenderOptions<ApplicationOptions> | undefined) {
		this.button.showing = true
		await super.render(force, options)
	}

	close(options?: Application.CloseOptions | undefined): Promise<void> {
		this.button.showing = false
		return super.close(options)
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object | Promise<object> {
		const user = (game as Game).user
		let modStack = user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) ?? []
		let meleeMods: RollModifier[] = [
			{ name: "to hit (Determined Attack)", modifier: 4, reference: "B365" },
			{ name: "to hit (Telegraphic Attack)", modifier: 4, reference: "MA113" },
			{ name: "to hit (Deceptive Attack)", modifier: -2, reference: "B369" },
			{ name: "to hit (Move and Attack)", modifier: -2, max: 9, reference: "B365" },
			{ name: "damage (Strong Attack)", modifier: 2, reference: "B365" },
			{ name: "damage (Might Blow)", modifier: 2, cost: { id: "fp", value: 1 }, reference: "MA131" },
			{ name: "Heroic Charge", modifier: 0, cost: { id: "fp", value: 1 }, reference: "MA131" },
		]
		let rangedMods: RollModifier[] = [
			{ name: "Aim", modifier: 1 },
			{ name: "to hit (Determined Attack)", modifier: 1, reference: "B365" },
		]
		let defenseMods: RollModifier[] = [
			{ name: "All-Out Defense", modifier: 2, reference: "B365" },
			{ name: "to Dodge (Shield DB)", modifier: 1, reference: "B374" },
			{ name: "to Dodge (Acrobatics, success)", modifier: 2, reference: "B374" },
			{ name: "to Dodge (Dodge and Drop)", modifier: 3, reference: "B377" },
			{ name: "to Dodge (Retreat)", modifier: 3, reference: "B375" },
			{ name: "to Block/Parry (Retreat)", modifier: 1, reference: "B377" },
			{ name: "to Dodge (Acrobatics, failed)", modifier: -2, reference: "B375" },
			{ name: "to Dodge (attacked from side)", modifier: -2, reference: "B390" },
			{ name: "to Dodge (attacked from reat)", modifier: -4, reference: "B391" },
			{ name: "to defenses due to Deceptive attack", modifier: -1 },
			{ name: "to Will Check, to maintain concentration", modifier: -1 },
			{ name: "Feverish Defense", modifier: +2, cost: { id: "fp", value: 1 } },
		]

		const players = (game as Game).users ?? []

		return mergeObject(super.getData(options), {
			value: this.value,
			players: players,
			meleeMods: meleeMods,
			rangedMods: rangedMods,
			defenseMods: defenseMods,
			currentMods: modStack,
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
		html.find(".active").on("click", event => this.removeModifier(event))
		html.find(".player").on("click", event => this.sendToPlayer(event))
		html.find(".modifier").on("click", event => this._onClickModifier(event))
	}

	_keyDown(event: JQuery.KeyDownEvent) {
		const value = ($(event.currentTarget).val() as string) ?? ""
		const customMod: RollModifier = { name: "", modifier: 0, tags: [] }
		const modifierMatch = value.match(/[-+]?[0-9]+\s*/)
		if (modifierMatch) {
			customMod.modifier = parseInt(modifierMatch[0]) ?? 0
			customMod.name = value.replace(modifierMatch[0], "")
		}
		if (
			["Enter", "Escape"].includes(event.key) ||
			// Vim keys
			(["j", "k"].includes(event.key) && event.ctrlKey)
		) {
			event.preventDefault()
			switch (event.key) {
				case "Enter":
					if (event.shiftKey) return this.togglePin(customMod)
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
			((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
		const index = $(event.currentTarget).data("index")
		modList.splice(index, 1)
		;(game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList)
		this.render()
		this.button.render()
	}

	togglePin(customMod: RollModifier) {
		const pinnedMods: RollModifier[] =
			((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierPinned) as RollModifier[]) ?? []
		const matchingMod = pinnedMods.find(e => e.name === customMod.name)
		if (matchingMod) {
			pinnedMods.splice(pinnedMods.indexOf(matchingMod), 1)
		} else {
			pinnedMods.push(customMod)
		}
		;(game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierPinned, pinnedMods)
		this.render()
	}

	addModifier(mod: RollModifier) {
		const modList: RollModifier[] =
			((game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
		const oldMod = modList.find(e => e.name === mod.name)
		if (oldMod) oldMod.modifier += mod.modifier
		else modList.push(mod)
		;(game as Game).user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList)
		this.value = ""
		this.render()
		this.button.render()
	}

	sendToPlayer(event: JQuery.ClickEvent) {
		event.preventDefault()
		const uuid = $(event.currentTarget).data("uuid")
		const player = (game as Game).users?.get(uuid)
		if (!player) return
		const modStack = (game as Game).user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack)
		return player.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modStack)
	}
}

interface ModifierBucket extends Application {
	button: ModifierButton
	value: string
}

export { ModifierBucket }
