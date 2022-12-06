export default class DamageChat {
	static TYPE = "damage"

	static async renderChatMessage(app: ChatMessage, html: JQuery<HTMLElement>, msg: any) {
		if (!html.find(".message-roll.damage").length) return true

		// Let transfer = JSON.parse(app?.flags.transfer)
		let payload = {}

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
