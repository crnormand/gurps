import { ActorGURPS } from "@module/config"
import { RollModifier, SYSTEM_NAME, UserFlags } from "@module/data"
import { LastActor } from "@util"

class ModifierList extends Application {
	hover = false

	collapse = true

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			popOut: false,
			minimizable: false,
			resizable: false,
			id: "ModifierList",
			template: `systems/${SYSTEM_NAME}/templates/modifier-list/list.hbs`,
			classes: ["modifier-list"],
		})
	}

	async getData(options?: Partial<ApplicationOptions> | undefined): Promise<object> {
		const currentMods = game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack)
		let targetMods: RollModifier[] = []
		const actor = (game.user?.isGM ? await LastActor.get() : game.user?.character) as ActorGURPS
		game.user?.targets.forEach(e => {
			targetMods = targetMods.concat((e.actor as ActorGURPS).modifiers)
		})
		let actorMods = actor?.modifiers

		return mergeObject(super.getData(options), {
			hover: this.hover ? "hover" : "",
			currentMods,
			targetMods,
			actorMods,
			collapse: this.collapse,
		})
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		const bottom = Math.max($("body").height()! - $("#players").position().top, 64)
		if (!this.collapse) html.css("bottom", `${bottom}px`)

		super.activateListeners(html)
		html.find(".active").on("click", event => this.removeModifier(event))
		html.find(".modifier").on("click", event => this._onClickModifier(event))
		html.find(".collapse-toggle").on("click", event => this._onCollapseToggle(event))
		html.on("mouseleave", () => {
			this.hover = false
			this.render(true)
		})
	}

	protected _injectHTML(html: JQuery<HTMLElement>): void {
		html.insertBefore($("#ui-left").find("#players"))
		this._element = html
	}

	_onClickModifier(event: JQuery.ClickEvent) {
		event.preventDefault()
		this.hover = true
		const modifier: RollModifier = {
			name: $(event.currentTarget).data("name"),
			modifier: $(event.currentTarget).data("modifier"),
		}
		return this.addModifier(modifier)
	}

	_onCollapseToggle(event: JQuery.ClickEvent) {
		event.preventDefault()
		this.collapse = !this.collapse
		return this.render(true)
	}

	protected addModifier(mod: RollModifier) {
		const modList: RollModifier[] =
			(game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
		const oldMod = modList.find(e => e.name === mod.name)
		if (oldMod) oldMod.modifier += mod.modifier
		else modList.push(mod)
		game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList)
		this.render()
		game.ModifierButton.render(true)
	}

	removeModifier(event: JQuery.ClickEvent) {
		event.preventDefault()
		const modList: RollModifier[] =
			(game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
		const index = $(event.currentTarget).data("index")
		modList.splice(index, 1)
		game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList)
		this.render()
		game.ModifierButton.render(true)
	}

	fadeIn() {
		this.hover = true
		this.render(true)
	}

	fadeOut() {
		this.hover = false
		this.render(true)
	}
}

export { ModifierList }
