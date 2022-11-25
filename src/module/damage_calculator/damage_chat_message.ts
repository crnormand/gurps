export default class DamageChat {
	static async renderChatMessage(app: ChatMessage, html: JQuery<HTMLElement>, msg: any) {
		if (!html.find(".message-roll.damage").length) return true

		// Let transfer = JSON.parse(app?.flags.transfer)

		const dragSections = html.find(".result")
		for (const section of dragSections) {
			// Section.setAttribute("draggable", "true")
		}
		return false
	}
}
