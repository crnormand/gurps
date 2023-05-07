import { ActorGURPS } from "@module/config"
import { ConfiguredDocumentClass } from "types/types/helperTypes"
import { TokenDocumentGURPS } from "./document"

class TokenGURPS extends Token {
	get actor(): ActorGURPS {
		return super.actor as ActorGURPS
	}

	protected override _onControl(options: { releaseOthers?: boolean; pan?: boolean } = {}): void {
		if (game.ready) game.EffectPanel.refresh()
		super._onControl(options)
	}

	protected override _onRelease(
		options: PlaceableObject.ReleaseOptions
	): Promise<InstanceType<ConfiguredDocumentClass<typeof TokenDocument>>> | undefined {
		game.EffectPanel.refresh()
		return super._onRelease(options)
	}
}

interface TokenGURPS extends Token {
	document: TokenDocumentGURPS
	/** A reference to an animation that is currently in progress for this Token, if any */
	_animation: Promise<unknown> | null
	// TODO: fix
	x: number
	y: number
	hitArea: any
}

export { TokenGURPS }
