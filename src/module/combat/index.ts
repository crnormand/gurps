import { DocumentModificationOptions } from "types/foundry/common/abstract/document.mjs"

// The whole point of this class is to not send messages when you roll initiative
class CombatGURPS extends Combat {
	protected _onDelete(options: DocumentModificationOptions, userId: string): void {
		;(game as Game).messages
			?.filter(e => Boolean(e.getFlag("core", "initiativeRoll")))
			.forEach(e => {
				e.delete()
			})
		return super._onDelete(options, userId)
	}
}

export { CombatGURPS }
