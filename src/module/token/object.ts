import { ActorGURPS } from "@module/config"
import { TokenDocumentGURPS } from "./document"

class TokenGURPS extends Token {
	get actor(): ActorGURPS {
		return super.actor as ActorGURPS
	}
}

interface TokenGURPS extends Token {
	document: TokenDocumentGURPS
	/** A reference to an animation that is currently in progress for this Token, if any */
	_animation: Promise<unknown> | null
}

export { TokenGURPS }
