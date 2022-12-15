import { ActorGURPS } from "@actor"
import { SYSTEM_NAME } from "@module/data"

export class LastActor {
	static set(actor: ActorGURPS, token?: TokenDocument): void {
		;(game as Game).user?.setFlag(SYSTEM_NAME, "last_actor", actor.uuid)
		if (token) (game as Game).user?.setFlag(SYSTEM_NAME, "last_token", token.uuid)
	}

	static async get(): Promise<ActorGURPS | null> {
		const uuid: string = String((game as Game).user?.getFlag(SYSTEM_NAME, "last_actor")) || ""
		const actor = fromUuid(uuid) as unknown as ActorGURPS
		if (actor) return actor
		return null
	}

	static async getToken(): Promise<TokenDocument | null> {
		const uuid: string = String((game as Game).user?.getFlag(SYSTEM_NAME, "last_token")) || ""
		const token = fromUuid(uuid) as unknown as TokenDocument
		if (token) return token
		return null
	}

	static async clear(a: ActorGURPS) {
		const currentLastActor = await LastActor.get()
		if (currentLastActor === a) {
			;(game as Game).user?.setFlag(SYSTEM_NAME, "last_actor", null)
			const tokens = canvas?.tokens
			if (tokens && tokens.controlled!.length! > 0) {
				LastActor.set(tokens.controlled[0]?.actor as ActorGURPS)
			}
		}
	}
}
