import { RollModifier, SYSTEM_NAME } from "@module/data"
import { DnD } from "@util/drag_drop"
import { DiceGURPS } from "@module/dice"
import { ChatMessageData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs"
import { TokenUtil } from "../../util/token_utils"
import { BaseActorGURPS } from "@actor/base"
import { CanvasUtil } from "@util/canvas"

export enum DamageChatFlags {
	Transfer = "transfer",
}

export type DamagePayload = {
	hitlocation: string
	attacker: ChatMessageData["speaker"]["_source"]
	weapon: { itemUuid: string; weaponId: string }
	name: string
	dice: DiceGURPS
	modifiers: Array<RollModifier & { class?: string }>
	total: number
	damageType: string
	rolls: { result: number; word: string }[]
	modifierTotal: number
}

type DropData = { type: string; x: number; y: number; payload: DamagePayload }

export class DamageChat {
	static TYPE = "damage"

	/*
	 * ChatMessage will contain a user flag named "flags.gurps.transfer". Convert that to an object and retrieve
	 * the "payload" property. This is the data that will be used to construct a DamageRoll and DamageTarget needed
	 * by the Damage Calculator. When the dragSection is dragged, attach the payload to the event's dataTransfer
	 * object.
	 */
	static async renderChatMessage(app: ChatMessage, html: JQuery<HTMLElement>, msg: any) {
		if (!html.find(".message-roll.damage").length) return true

		let transfer = JSON.parse(DamageChat.getTransferFlag(app))
		let payload = transfer.payload as DamagePayload

		const dragSections = html.find(".result")
		for (const section of dragSections) {
			// Section.setAttribute("draggable", "true")
			section.addEventListener("dragstart", DamageChat._dragStart.bind(this, payload))
			section.addEventListener("dragend", DamageChat._dragEnd)
		}
		return false
	}

	static getTransferFlag(object: any): string {
		return getProperty(object, `flags.${SYSTEM_NAME}.${DamageChatFlags.Transfer}`)
	}

	static setTransferFlag(object: any, payload: DamagePayload, userTarget: string) {
		let transfer = JSON.stringify({ type: DamageChat.TYPE, payload: payload, userTarget: userTarget })
		setProperty(object, `flags.${SYSTEM_NAME}.${DamageChatFlags.Transfer}`, transfer)
		return object
	}

	static async _dragStart(payload: DamagePayload, event: DragEvent) {
		DnD.setDragData(event, DamageChat.TYPE, payload, DnD.TEXT_PLAIN)
	}

	static async _dragEnd(ev: DragEvent) {
		// Add any handling code here.
	}

	static async handleDropOnCanvas(canvas: Canvas, dropData: DropData): Promise<void> {
		if (dropData.type !== DamageChat.TYPE) return

		// Check to see what is under the cursor at this drop point
		const tokens = CanvasUtil.getCanvasTokensAtPosition({ x: dropData.x, y: dropData.y })

		if (tokens.length === 0) return

		// Define the handler function for damage.
		const handleDamageDrop = (actor: BaseActorGURPS) => actor.handleDamageDrop(dropData.payload)

		// If only one token in the targets array, use that one.
		if (tokens.length === 1) {
			handleDamageDrop(tokens[0].actor as BaseActorGURPS)
			return
		}

		const token = await TokenUtil.askWhichToken(tokens)
		if (token?.actor) handleDamageDrop(token.actor as BaseActorGURPS)
	}
}
