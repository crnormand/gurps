import { ConditionID, ManeuverID } from "@item/condition"
import { SYSTEM_NAME } from "@module/data"
import { i18n } from "@util"
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

	getData(options?: Partial<ApplicationOptions> | undefined): MaybePromise<object> {
		const maneuvers: any = {}
		const maneuverList: Array<[string, any]> = [...Object.values(ManeuverID)].map(e => {
			const icon = `systems/${SYSTEM_NAME}/assets/maneuver/${e}.png`
			return [icon, { id: e, title: i18n(`gurps.status.${e}`), src: icon }]
		})
		console.log(maneuverList)
		for (const k of maneuverList) {
			maneuvers[k[0]] = k[1]
		}
		console.log(maneuvers)
		return {
			...super.getData(options),
			...{
				maneuvers,
			},
		}
	}

	// Geteffs() {
	// 	return this._getStatusEffectChoices()
	// }

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
		button.classList.toggle("active", active)
		const palette = button.querySelector(".maneuvers")
		palette?.classList.toggle("active", active)
	}

	static #showStatusLabel(icon: HTMLPictureElement): void {
		let titleBar = icon.closest(".icon-grid")?.querySelector<HTMLElement>(".title-bar")
		// Let titleBar = icon.closest(".status-effects")?.querySelector<HTMLElement>(".title-bar")
		// if (!titleBar) icon.closest(".maneuvers")?.querySelector<HTMLElement>(".title-bar")
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

		const id: ConditionID = icon.dataset.statusId as ConditionID
		const deadIcon = `systems/${SYSTEM_NAME}/assets/status/dead.png`
		const { actor } = token
		if (!(actor && id)) return

		if (event.type === "click") {
			if (id === "dead") {
				if (token.combatant?.isDefeated) {
					await token.combatant?.update({ defeated: false })
					await token.toggleEffect(deadIcon, { overlay: true, active: false })
				} else {
					await token.combatant?.update({ defeated: true })
					await token.toggleEffect(deadIcon, { overlay: true, active: true })
				}
			} else await actor?.increaseCondition(id)
		} else if (event.type === "contextmenu") {
			if (token.document.overlayEffect === deadIcon) {
				await token.combatant?.update({ defeated: false })
				await token.toggleEffect(deadIcon, { overlay: true, active: false })
			} else await actor.decreaseCondition(id)
		}
	}

	static async setActiveEffects(token: TokenGURPS, icons: NodeListOf<HTMLImageElement>) {
		const affectingConditions = token.actor?.conditions

		for (const icon of icons) {
			// Replace the img element with a picture element, which can display ::after content
			const picture = document.createElement("picture")
			picture.classList.add("effect-control")
			picture.dataset.statusId = icon.dataset.statusId
			picture.title = icon.title
			const iconSrc = icon.getAttribute("src")!
			picture.setAttribute("src", iconSrc)
			const newIcon = document.createElement("img")
			newIcon.src = iconSrc
			picture.append(newIcon)
			icon.replaceWith(picture)

			const id = picture.dataset.statusId ?? ""
			const affecting = affectingConditions.filter(c => c.cid === id)
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
		if (!maneuverGrid) throw Error("Unexpected error retrieving maneuver grid")

		// Const affectingConditions = token.actor?.conditions

		// const titleBar = document.createElement("div")
		// titleBar.className = "title-bar"
		// iconGrid.append(titleBar)
		// maneuverGrid.append(titleBar)

		const statusIcons = iconGrid.querySelectorAll<HTMLImageElement>(".effect-control")
		const maneuverIcons = maneuverGrid.querySelectorAll<HTMLImageElement>(".effect-control")

		// For (const icon of statusIcons) {
		// 	// Replace the img element with a picture element, which can display ::after content
		// 	const picture = document.createElement("picture")
		// 	picture.classList.add("effect-control")
		// 	picture.dataset.statusId = icon.dataset.statusId
		// 	picture.title = icon.title
		// 	const iconSrc = icon.getAttribute("src")!
		// 	picture.setAttribute("src", iconSrc)
		// 	const newIcon = document.createElement("img")
		// 	newIcon.src = iconSrc
		// 	picture.append(newIcon)
		// 	icon.replaceWith(picture)

		// 	const id = picture.dataset.statusId ?? ""
		// 	const affecting = affectingConditions.filter(c => c.cid === id)
		// 	if (affecting.length > 0 || iconSrc === (token.document as any).overlayEffect) {
		// 		picture.classList.add("active")
		// 	}

		// 	if (affecting.length > 0) {
		// 		// Show a badge icon if the condition has a value or is locked
		// 		const hasValue = affecting.some(c => c.canLevel)

		// 		if (hasValue) {
		// 			const badge = document.createElement("i")
		// 			badge.classList.add("badge")
		// 			const value = Math.max(...affecting.map(c => c.level ?? 1))
		// 			badge.innerText = value.toString()
		// 			picture.append(badge)
		// 		}
		// 	}
		// }
		await this.setActiveEffects(token, statusIcons)
		await this.setActiveEffects(token, maneuverIcons)

		this.#activateListeners(iconGrid, token)
		this.#activateListeners(maneuverGrid, token)
	}
}
