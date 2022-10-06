import { ActorGURPS } from "@actor"
import { SYSTEM_NAME } from "@module/settings"

export class LastActor {
	static set(actor: ActorGURPS): void {
		;(game as Game).user?.setFlag(SYSTEM_NAME, "last_actor", actor.uuid)
	}

	static get(): ActorGURPS | null {
		const uuid: string = String((game as Game).user?.getFlag(SYSTEM_NAME, "last_actor")) || ""
		const actor = fromUuid(uuid) as unknown as ActorGURPS
		if (actor) return actor
		return null
	}
}
