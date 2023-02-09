// Mostly disabled but left here just to get rid of the parentheses in labels
// this makes it more consistent with our custom status effect messages
// the only time this is used is when you do anything with the "DEFEATED" special status effect
class ActiveEffectGURPS extends ActiveEffect {
	override _displayScrollingStatus(enabled: boolean) {
		if (!((this as any).flags.core?.statusId || (this as any).changes.length)) return
		const actor = this.parent as any
		const tokens = actor?.isToken ? [actor.token?.object] : actor.getActiveTokens(true)
		const label = `${enabled ? "+" : "-"} ${(this as any).label}`
		for (let t of tokens) {
			if (!t.visible || !t.renderable) continue
			;(canvas as any).interface.createScrollingText(t.center, label, {
				anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
				direction: enabled ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
				distance: 2 * t.h,
				fontSize: 28,
				stroke: 0x000000,
				strokeThickness: 4,
				jitter: 0.25,
			})
		}
	}
}

export { ActiveEffectGURPS }
