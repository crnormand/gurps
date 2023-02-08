export const CanvasUtil = {
	/**
	 * @param point location to "search" for Tokens.
	 * @param point.x the x coordinate.
	 * @param point.y the y coordinate.
	 * @returns {Token[]} the Set of tokens found.
	 */
	getCanvasTokensAtPosition: function (point: { x: number; y: number }): Token[] {
		// Remember the user's current targets (so we can restore them afterwards).
		const oldTargets = [...game.user!.targets]

		// Create a rectangle the size of a grid element centered on the point.
		const gridSize = (canvas!.scene as any).grid!.size
		const rectangle = {
			x: point.x - gridSize / 2,
			y: point.y - gridSize / 2,
			height: gridSize,
			width: gridSize,
		}

		// Target all Tokens that fall inside the rectangle.
		canvas!.tokens!.targetObjects(rectangle, { releaseOthers: true })
		const newTargets = [...game.user!.targets]

		// Now that we have the list of targets, reset the target selection back to whatever the user previously had.
		// First, remove the newTargets...
		newTargets.forEach(t => t.setTarget(false, { releaseOthers: false, groupSelection: true }))
		// ...Finally, re-select the oldTargets.
		oldTargets.forEach(t => t.setTarget(true, { releaseOthers: false, groupSelection: true }))

		return newTargets
	},
}
