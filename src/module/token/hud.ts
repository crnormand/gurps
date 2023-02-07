import { ConditionID } from "@item/condition"
import { SYSTEM_NAME } from "@module/data"
import { TokenGURPS } from "./object"

export class TokenHUDGURPS {
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

	/**
	 * Show the Status Effect name and summary on mouseover of the token HUD
	 * @param icon
	 */
	static #showStatusLabel(icon: HTMLPictureElement): void {
		const titleBar = icon.closest(".status-effects")?.querySelector<HTMLElement>(".title-bar")
		if (titleBar && icon.title) {
			titleBar.innerText = icon.title
			titleBar.classList.toggle("active")
		}
	}

	/**
	 * A click event handler to increment or decrement valued conditions.
	 * @param event The window click event
	 * @param token
	 */
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

	static async onRenderTokenHUD(html: HTMLElement, tokenData: any): Promise<void> {
		const token = canvas?.tokens?.get(tokenData._id) as TokenGURPS
		if (!token) return

		const iconGrid = html.querySelector<HTMLElement>(".status-effects")
		if (!iconGrid) throw Error("Unexpected error retrieving status effects grid")

		const affectingConditions = token.actor?.conditions

		const titleBar = document.createElement("div")
		titleBar.className = "title-bar"
		iconGrid.append(titleBar)

		const statusIcons = iconGrid.querySelectorAll<HTMLImageElement>(".effect-control")

		for (const icon of statusIcons) {
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

		this.#activateListeners(iconGrid, token)
	}
}
