// COMPATIBILITY: v12
function registerTokenRuler() {
  if (!game.release) return
  if (game.release?.generation < 13) return

  // @ts-expect-error: waiting for types to catch up
  class GurpsTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {
    /**
     * Get the style to be used to highlight the grid offset.
     * @param {DeepReadonly<Omit<TokenRulerWaypoint, "index"|"center"|"size"|"ray">>} waypoint    The waypoint
     * @param {DeepReadonly<GridOffset3D>} offset  An occupied grid offset at the given waypoint that is to be highlighted
     * @returns {{color?: PIXI.ColorSource; alpha?: number; texture?: PIXI.Texture; matrix?: PIXI.Matrix | null}}
     *   The color, alpha, texture, and texture matrix to be used to draw the grid space.
     *   If the alpha is 0, the grid space is not highlighted.
     */
    // @ts-expect-error: waiting for types to catch up
    protected override _getGridHighlightStyle(
      // @ts-expect-error: waiting for types to catch up
      waypoint: TokenRulerWaypoint,
      offset: { i: number; j: number }
    ): { color?: PIXI.ColorSource; alpha?: number; texture?: PIXI.Texture; matrix?: PIXI.Matrix | null } {
      const data = super._getGridHighlightStyle(waypoint, offset)
      const actor = this.token.actor
      if (!actor) return data

      // @ts-expect-error: waiting for actor update to DataModel
      if (waypoint.measurement.cost <= Math.ceil(actor.system.currentmove / 10)) {
        return { ...data, color: 0x0000ff }
        // @ts-expect-error: waiting for actor update to DataModel
      } else if (waypoint.measurement.cost > actor.system.currentsprint) {
        return { ...data, color: 0xff0000 }
        // @ts-expect-error: waiting for actor update to DataModel
      } else if (waypoint.measurement.cost > actor.system.currentmove) {
        return { ...data, color: 0xffff00 }
      } else {
        return { ...data, color: 0x00ff00 }
      }

    }
  }

  // COMPATIBILITY: v12
  interface GurpsTokenRuler {
    token: Token.Implementation
  }

  // @ts-expect-error: waiting for types to catch up
  CONFIG.Token.rulerClass = GurpsTokenRuler
}

export { registerTokenRuler }
