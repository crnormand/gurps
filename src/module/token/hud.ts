import { ConditionID, EffectID, ManeuverID } from "@item"
import { SOCKET, SYSTEM_NAME } from "@module/data"
import { TokenGURPS } from "./object"

export class TokenHUDGURPS extends TokenHUD {
	_maneuvers = false

	get template(): string {
		return `systems/${SYSTEM_NAME}/templates/hud/token.hbs`
	}

	static #activateListeners(html: HTMLElement, token: TokenGURPS): void {
		const effectControls = html.querySelectorAll<HTMLPictureElement>(".effect-control")

		for (const control of effectControls) {
			control.addEventListener("click", event => {
				this.#setStatusValue(event, token)
			})
			control.addEventListener("contextmenu", event => {
				this.#setStatusValue(event, token)
			})

			control.addEventListener("mouseover", () => {
				this.#showStatusLabel(control)
			})
			control.addEventListener("mouseout", () => {
				this.#showStatusLabel(control)
			})
		}
	}

	activateListeners(html: JQuery<HTMLElement>) {
		super.activateListeners(html)
		this._toggleManeuvers(this._maneuvers)
	}

	getData(options?: Partial<ApplicationOptions> | undefined): MaybePromise<object> {
		const data: any = mergeObject(super.getData(options), {
			inCombat: this.object?.inCombat,
		})
		data.maneuvers = this._getManeuverChoices()
		return data
	}

	_getManeuverChoices() {
		const effects = super._getStatusEffectChoices()
		const filteredEffects = Object.keys(effects)
			.filter((key: string) => key.includes("/maneuver/"))
			.reduce((obj: any, key: string) => {
				return Object.assign(obj, {
					[key]: effects[key],
				})
			}, {})
		return filteredEffects
	}

	override _getStatusEffectChoices() {
		const effects = super._getStatusEffectChoices()
		const filteredEffects = Object.keys(effects)
			.filter((key: string) => key.includes("/status/"))
			.reduce((obj: any, key: string) => {
				return Object.assign(obj, {
					[key]: effects[key],
				})
			}, {})
		return filteredEffects
	}

	protected async _onToggleCombat(event: JQuery.ClickEvent<any, any, any, any>): Promise<void> {
		event.preventDefault()
		await super._onToggleCombat(event)
		const { actor } = this.object as TokenGURPS
		if (actor) {
			if (this.object?.inCombat) await actor.changeManeuver(ManeuverID.DoNothing)
			else actor.resetManeuvers()
		}
		await this.render(true)
	}

	protected _onClickControl(event: JQuery.ClickEvent) {
		super._onClickControl(event)
		const button = event.currentTarget
		switch (button.dataset.action) {
			case "maneuvers":
				return this._onToggleManeuvers(event)
		}
	}

	protected _onToggleStatusEffects(event: JQuery.ClickEvent) {
		event.preventDefault()
		this._toggleManeuvers(false)
		this._toggleStatusEffects(!this._statusEffects)
	}

	protected _onToggleManeuvers(event: JQuery.ClickEvent) {
		event.preventDefault()
		this._maneuvers = $(event.currentTarget).hasClass("active")
		this._toggleStatusEffects(false)
		this._toggleManeuvers(!this._maneuvers)
	}

	_toggleManeuvers(active: boolean) {
		this._maneuvers = active
		const button = this.element.find('.control-icon[data-action="maneuvers"]')[0]
		if (!button) return
		button.classList.toggle("active", active)
		const palette = button.querySelector(".maneuvers")
		palette?.classList.toggle("active", active)
	}

	static #showStatusLabel(icon: HTMLPictureElement): void {
		const titleBar = icon.closest(".icon-grid")?.querySelector<HTMLElement>(".title-bar")
		if (titleBar && icon.title) {
			titleBar.innerText = icon.title
			titleBar.classList.toggle("active")
		}
	}

	static async #setStatusValue(event: MouseEvent, token: TokenGURPS): Promise<void> {
		event.preventDefault()
		event.stopPropagation()

		const icon = event.currentTarget
		if (!(icon instanceof HTMLPictureElement)) return
		const id: EffectID = icon.dataset.statusId as EffectID
		const { actor } = token
		if (!(actor && id)) return
		const combatant = token.combatant

		if (id === "dead") {
			const isDefeated = combatant ? !combatant.isDefeated : !actor.hasCondition([ConditionID.Dead])
			if (combatant) await combatant.update({ defeated: isDefeated })
			const status = CONFIG.statusEffects.find(e => e.id === CONFIG.specialStatusEffects.DEFEATED)
			const effect = token.actor && status ? status : CONFIG.controlIcons.defeated
			token.toggleEffect(effect, { overlay: true, active: isDefeated })
			return
		}
		if (event.type === "click") {
			await actor?.increaseCondition(id)
		} else if (event.type === "contextmenu") {
			if (event.ctrlKey) await actor?.decreaseCondition(id, { forceRemove: true })
			else await actor?.decreaseCondition(id)
		}
		game.socket?.emit("system.gcsga", { type: SOCKET.UPDATE_BUCKET, users: [] })
	}

	static async #setActiveEffects(token: TokenGURPS, icons: NodeListOf<HTMLImageElement>) {
		const affectingConditions = token.actor?.conditions

		for (const icon of icons) {
			const picture = document.createElement("picture")
			picture.classList.add("effect-control")
			picture.dataset.statusId = icon.dataset.statusId
			if (icon.title) picture.title = icon.title
			else picture.setAttribute("style", "cursor: default;")
			const iconSrc = icon.getAttribute("src")!
			picture.setAttribute("src", iconSrc)
			const newIcon = document.createElement("img")
			newIcon.src = iconSrc
			picture.append(newIcon)
			icon.replaceWith(picture)

			const id = picture.dataset.statusId ?? ""
			const affecting = affectingConditions?.filter(c => c.cid === id) || []
			if (affecting.length > 0 || iconSrc === (token.document as any).overlayEffect) {
				picture.classList.add("active")
			}

			if (affecting.length > 0) {
				// Show a badge icon if the condition has a value or is locked
				const hasValue = affecting.some(c => c.canLevel)

				if (hasValue) {
					const badge = document.createElement("i")
					badge.classList.add("badge")
					const value = Math.max(...affecting.map(c => c.level ?? 1))
					badge.innerText = value.toString()
					picture.append(badge)
				}
			}
		}
	}

	static async onRenderTokenHUD(html: HTMLElement, tokenData: any): Promise<void> {
		const token = canvas?.tokens?.get(tokenData._id) as TokenGURPS
		if (!token) return

		const iconGrid = html.querySelector<HTMLElement>(".status-effects")
		const maneuverGrid = html.querySelector<HTMLElement>(".maneuvers")
		if (!iconGrid) throw Error("Unexpected error retrieving status effects grid")
		const statusIcons = iconGrid.querySelectorAll<HTMLImageElement>(".effect-control")
		const maneuverIcons = maneuverGrid?.querySelectorAll<HTMLImageElement>(".effect-control")

		await this.#setActiveEffects(token, statusIcons)
		this.#activateListeners(iconGrid, token)

		if (maneuverGrid && maneuverIcons) {
			await this.#setActiveEffects(token, maneuverIcons)
			this.#activateListeners(maneuverGrid, token)
		}
	}

	_onToggleEffect(event: JQuery.ClickEvent | JQuery.ContextMenuEvent, { overlay = false } = {}): Promise<boolean> {
		event.preventDefault()
		event.stopPropagation()
		let img = event.currentTarget
		const effect =
			img.dataset.statusId && this.object?.actor
				? CONFIG.statusEffects.find(e => e.id === img.dataset.statusId)
				: img.getAttribute("src")
		// Console.log(img, effect)
		return this.object!.toggleEffect(effect, { overlay })
	}
}
