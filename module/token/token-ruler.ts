import { Length, LengthUnit } from '../data/common/length.js'

// COMPATIBILITY: v12
function registerTokenRuler() {
  if (!game.release) return
  if (game.release?.generation < 13) return

  class GurpsTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {
    /**
     * Get the style to be used to highlight the grid offset.
     * @param {DeepReadonly<Omit<TokenRulerWaypoint, "index"|"center"|"size"|"ray">>} waypoint    The waypoint
     * @param {DeepReadonly<GridOffset3D>} offset  An occupied grid offset at the given waypoint that is to be highlighted
     * @returns {{color?: PIXI.ColorSource; alpha?: number; texture?: PIXI.Texture; matrix?: PIXI.Matrix | null}}
     *   The color, alpha, texture, and texture matrix to be used to draw the grid space.
     *   If the alpha is 0, the grid space is not highlighted.
     */
    protected override _getGridHighlightStyle(
      // @ts-expect-error: waiting for types to catch up
      waypoint: TokenRulerWaypoint,
      offset: { i: number; j: number }
    ): { color?: PIXI.ColorSource; alpha?: number; texture?: PIXI.Texture; matrix?: PIXI.Matrix | null } {
      // @ts-expect-error waiting for types to catch up
      const data = super._getGridHighlightStyle(waypoint, offset)
      const actor = this.token.actor
      if (!actor) return data

      const units = Length.unitFromString(canvas?.scene?.grid.units ?? Length.Unit.Yard)
      const yards = Length.from(waypoint.measurement.cost, units as LengthUnit)?.to(Length.Unit.Yard).value ?? 0

      if (yards <= Math.ceil(actor.system.currentmove / 10)) {
        return { ...data, color: 0x0000ff } // Step: blue
      } else if (yards <= actor.system.currentmove) {
        return { ...data, color: 0x00ff00 } // Normal move: green
      } else if (yards <= actor.system.currentsprint) {
        return { ...data, color: 0xffff00 } // Sprint / Enhanced move: yellow
      } else {
        return { ...data, color: 0xff0000 } // More than sprint: red
      }
    }
  }

  CONFIG.Token.rulerClass = GurpsTokenRuler
}

export { registerTokenRuler }
