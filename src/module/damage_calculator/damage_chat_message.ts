import { SYSTEM_NAME } from "@module/data"

export enum DamageChatFlags {
	Transfer = "transfer",
}

export default class DamageChat {
	static TYPE = "damage"

	static getTransferFlag(object: any) {
		return getProperty(object, `flags.${SYSTEM_NAME}.${DamageChatFlags.Transfer}`)
	}

	static setTransferFlag(object: any, payload: any, userTarget: string) {
		let transfer = JSON.stringify({ type: DamageChat.TYPE, payload: payload, userTarget: userTarget })
		setProperty(object, `flags.${SYSTEM_NAME}.${DamageChatFlags.Transfer}`, transfer)
		return object
	}

	static async renderChatMessage(app: ChatMessage, html: JQuery<HTMLElement>, msg: any) {
		if (!html.find(".message-roll.damage").length) return true

		let transfer = JSON.parse(DamageChat.getTransferFlag(app))
		let payload = transfer.payload

		const dragSections = html.find(".result")
		for (const section of dragSections) {
			// Section.setAttribute("draggable", "true")
			section.addEventListener("dragstart", DamageChat._dragStart.bind(this, payload))
			section.addEventListener("dragend", DamageChat._dragEnd)
		}
		return false
	}

	static async _dragStart(payload: any, ev: DragEvent) {
		return ev.dataTransfer?.setData(
			"text/plain",
			JSON.stringify({
				type: DamageChat.TYPE,
				payload: payload,
			})
		)
	}

	static async _dragEnd(ev: DragEvent) {
		// Add any handling code here.
	}
}
