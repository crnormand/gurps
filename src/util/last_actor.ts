import { ActorGURPS } from "@module/config"
import { SYSTEM_NAME } from "@module/data"

export class LastActor {
	static set(actor: ActorGURPS, token?: TokenDocument): void {
		game.user?.setFlag(SYSTEM_NAME, "last_actor", actor.uuid)
		if (token) game.user?.setFlag(SYSTEM_NAME, "last_token", token.uuid)
		game.ModifierButton.render(true)
	}

	static async get(): Promise<ActorGURPS | null> {
		const uuid: string = String(game.user?.getFlag(SYSTEM_NAME, "last_actor")) || ""
		let actor: any = await fromUuid(uuid)
		if (actor instanceof TokenDocument) actor = actor.actor
		if (actor) return actor
		return null
	}

	static async getToken(): Promise<TokenDocument | null> {
		const uuid: string = String(game.user?.getFlag(SYSTEM_NAME, "last_token")) || ""
		const token: any = await fromUuid(uuid)
		if (token) return token
		return null
	}

	static async clear(a: ActorGURPS) {
		const currentLastActor = await LastActor.get()
		if (currentLastActor === a) {
			game.user?.setFlag(SYSTEM_NAME, "last_actor", null)
			const tokens = canvas?.tokens
			if (tokens && tokens.controlled!.length! > 0) {
				LastActor.set(tokens.controlled[0]?.actor as ActorGURPS)
			}
		}
	}
}
