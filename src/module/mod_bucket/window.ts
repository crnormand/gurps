import { RollModifier, UserFlags } from "@module/data"
import { ModifierButton } from "@module/mod_prompt/button"
import { SYSTEM_NAME } from "@module/settings"

class ModifierBucket extends Application {
	constructor(button: ModifierButton, options = {}) {
		super(options)
		this.value = ""
		this.button = button
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			id: "ModifierBucket",
			template: `systems/${SYSTEM_NAME}/templates/modifier-bucket/window.hbs`,
			popOut: false,
			minimizable: false,
			classes: ["modifier-app-bucket"],
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

		return mergeObject(super.getData(options), {
			value: this.value,
			applied_mods: modStack,
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
		const width = 180
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
		html.find(".click-delete").on("click", event => this.removeModifier(event))
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
}

interface ModifierBucket extends Application {
	button: ModifierButton
	value: string
}

export { ModifierBucket }
