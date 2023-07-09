import { ActorGURPS } from "@module/config"
import { ActiveEffectGURPS } from "@module/effect"
import EmbeddedCollection from "types/foundry/common/abstract/embedded-collection.mjs"
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

	// override drawEffects(): Promise<void> {
	// 	super.drawEffects()
	//    const wasVisible = this.effects.visible;
	//    this.effects.visible = false;
	//    this.effects.removeChildren().forEach(c => c.destroy());
	//    this.effects.bg = this.effects.addChild(new PIXI.Graphics());
	//    this.effects.bg.visible = false;
	//    this.effects.overlay = null;

	//    // Categorize new effects
	//    const tokenEffects = this.document.effects;
	//    const actorEffects = this.actor?.temporaryEffects || [];
	//    let overlay = {
	//      src: this.document.overlayEffect,
	//      tint: null
	//    };

	//    // Draw status effects
	//    if ( tokenEffects.length || actorEffects.length ) {
	//      const promises = [];

	//      // Draw actor effects first
	//      for ( let f of actorEffects ) {
	//        if ( !f.icon ) continue;
	//        const tint = Color.from(f.tint ?? null);
	//        if ( f.getFlag("core", "overlay") ) {
	//          if ( overlay ) promises.push(this._drawEffect(overlay.src, overlay.tint));
	//          overlay = {src: f.icon, tint};
	//          continue;
	//        }
	//        promises.push(this._drawEffect(f.icon, tint));
	//      }

	//      // Next draw token effects
	//      for ( let f of tokenEffects ) promises.push(this._drawEffect(f, null));
	//      await Promise.all(promises);
	//    }

	//    // Draw overlay effect
	//    this.effects.overlay = await this._drawOverlay(overlay.src, overlay.tint);
	//    this.effects.bg.visible = true;
	//    this.effects.visible = wasVisible;
	//    this._refreshEffects();
	// }
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
